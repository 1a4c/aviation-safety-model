/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  TelemetryFrame,
  ShelteredPacket,
  DisturbanceConfig,
  KalmanFilterParams,
} from '../types/avionics';

// Simple CRC32 implementation for firmware packet sealing
function crc32(str: string): string {
  let crc = 0 ^ (-1);
  for (let i = 0; i < str.length; i++) {
    crc = (crc >>> 8) ^ TABLE[(crc ^ str.charCodeAt(i)) & 0xff];
  }
  return ((crc ^ (-1)) >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

const TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  TABLE[i] = c;
}

// Standard normal distribution generator (Box-Muller)
function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export class AvionicsEngine {
  private config: DisturbanceConfig = {
    turbulenceLevel: 25,
    brownianDiffusionCoeff: 0.12,
    emiNoiseActive: false,
    windShearAngle: 45,
    windShearSpeed: 6.5,
    sensorFlawActive: false,
    innovationThreshold: 12.0, // deg/s tripwire
    burstDurationMs: 1400,
  };

  private kalmanParams: KalmanFilterParams = {
    processNoiseQ: 0.008,
    measurementNoiseR: 0.09,
    driftPredictorWeight: 0.88,
  };

  // True flight state
  private roll = 0; // deg
  private pitch = 0; // deg
  private yaw = 84.5; // deg
  private altitude = 148.0; // m
  private airspeed = 18.2; // m/s
  private flightTime = 0; // sec

  // Brownian random walk drift state (IMU sensor intrinsic drift)
  private brownianX = 0;
  private brownianY = 0;
  private brownianZ = 0;
  private predictedDriftX = 0;
  private predictedDriftY = 0;
  private predictedDriftZ = 0;

  // Discrete Kalman Filter state for Roll and Pitch: [angle, bias]
  private kfRoll = { angle: 0, bias: 0, P: [[1, 0], [0, 1]] };
  private kfPitch = { angle: 0, bias: 0, P: [[1, 0], [0, 1]] };
  private kfYaw = { angle: 84.5, bias: 0, P: [[1, 0], [0, 1]] };

  // Intensified Period-Captured State
  private burstActive = false;
  private burstTimerMs = 0;
  private samplingRateHz = 100; // 100Hz nominal, 1000Hz burst
  private packetCounter = 1024;

  // Sheltered Hardware Ring Buffer (SRAM TCM: capacity 16 slots)
  private shelteredRing: ShelteredPacket[] = [];
  private readonly RING_CAPACITY = 16;
  private baseSramAddress = 0x20001f00;

  // Target command controls
  private targetRoll = 0;
  private targetPitch = 0;
  private targetYaw = 84.5;

  constructor() {
    this.initShelteredRing();
  }

  private initShelteredRing() {
    this.shelteredRing = [];
    for (let i = 0; i < this.RING_CAPACITY; i++) {
      const addrHex = '0x' + (this.baseSramAddress + i * 32).toString(16).toUpperCase();
      this.shelteredRing.push({
        id: this.packetCounter++,
        timestampUs: 1000000 + i * 10000,
        sramAddress: addrHex,
        quaternion: [1, 0, 0, 0],
        angularRates: [0, 0, 0],
        accelerations: [0, 0, 9.81],
        crc32: 'A1B2C3D4',
        isSealed: true,
        isSheltered: true,
        junction0Routed: true,
        priorityLevel: 3,
        validityScore: 0.99,
      });
    }
  }

  public setConfig(cfg: Partial<DisturbanceConfig>) {
    this.config = { ...this.config, ...cfg };
  }

  public getConfig(): DisturbanceConfig {
    return { ...this.config };
  }

  public setKalmanParams(params: Partial<KalmanFilterParams>) {
    this.kalmanParams = { ...this.kalmanParams, ...params };
  }

  public getKalmanParams(): KalmanFilterParams {
    return { ...this.kalmanParams };
  }

  public setTargetAttitude(roll: number, pitch: number, yaw?: number) {
    this.targetRoll = roll;
    this.targetPitch = pitch;
    if (yaw !== undefined) this.targetYaw = yaw;
  }

  public triggerManualBurst() {
    this.burstActive = true;
    this.burstTimerMs = this.config.burstDurationMs;
    this.samplingRateHz = 1000;
  }

  public injectTransientFlaw() {
    this.config.sensorFlawActive = true;
    setTimeout(() => {
      this.config.sensorFlawActive = false;
    }, 450);
  }

  public injectEmiPulse() {
    this.config.emiNoiseActive = true;
    setTimeout(() => {
      this.config.emiNoiseActive = false;
    }, 700);
  }

  /**
   * Primary Simulation Step (called at animation or timer rate)
   * dt: delta time in seconds
   */
  public update(dt: number): TelemetryFrame {
    this.flightTime += dt;

    // 1. Flight Dynamics with Gentle Loiter & Control Input
    const smoothFactor = Math.min(1.0, dt * 2.8);
    // Natural slight loitering oscillation
    const loiterRoll = Math.sin(this.flightTime * 0.45) * 3.5;
    const loiterPitch = Math.cos(this.flightTime * 0.32) * 2.0;

    const cmdRoll = this.targetRoll + loiterRoll;
    const cmdPitch = this.targetPitch + loiterPitch;

    this.roll += (cmdRoll - this.roll) * smoothFactor;
    this.pitch += (cmdPitch - this.pitch) * smoothFactor;
    this.yaw = (this.yaw + dt * 0.8) % 360;

    // Altitude and airspeed slight cruise dynamics
    this.altitude = 148.0 + Math.sin(this.flightTime * 0.2) * 3.5;
    this.airspeed = 18.2 + Math.cos(this.flightTime * 0.25) * 1.2;

    // 2. Atmospheric Disturbance & Turbulence (Dryden-like stochastic vectors)
    const turbFactor = (this.config.turbulenceLevel / 100) * 16.0;
    const windEffect = (this.config.windShearSpeed / 20.0) * 8.0;
    const gustX = gaussianRandom() * turbFactor + Math.sin(this.flightTime * 2.5) * windEffect;
    const gustY = gaussianRandom() * turbFactor + Math.cos(this.flightTime * 3.1) * windEffect;
    const gustZ = gaussianRandom() * (turbFactor * 0.6);

    // Dynamic actual angular velocities (deg/s)
    const trueRateX = (cmdRoll - this.roll) * 1.5 + gustX * 0.2;
    const trueRateY = (cmdPitch - this.pitch) * 1.5 + gustY * 0.2;
    const trueRateZ = 0.8 + gustZ * 0.15;

    // 3. Brownian Motion Drift Model (Brownianized Setting)
    // dW(t) = sqrt(dt) * N(0, 1)
    const brownianStep = Math.sqrt(Math.max(0.001, dt)) * this.config.brownianDiffusionCoeff * 5.0;
    this.brownianX += gaussianRandom() * brownianStep;
    this.brownianY += gaussianRandom() * brownianStep;
    this.brownianZ += gaussianRandom() * (brownianStep * 0.7);

    // Bound drift from unbounded divergence
    this.brownianX = Math.max(-25, Math.min(25, this.brownianX));
    this.brownianY = Math.max(-25, Math.min(25, this.brownianY));
    this.brownianZ = Math.max(-25, Math.min(25, this.brownianZ));

    // Firmware Brownian drift predictor (Order_probe.distinguished_validity.via_traffic)
    // Tracks drift using leaky integral estimator
    const alphaDrift = 0.08 * this.kalmanParams.driftPredictorWeight;
    this.predictedDriftX += (this.brownianX - this.predictedDriftX) * alphaDrift;
    this.predictedDriftY += (this.brownianY - this.predictedDriftY) * alphaDrift;
    this.predictedDriftZ += (this.brownianZ - this.predictedDriftZ) * alphaDrift;

    // 4. Raw Sensor Generation (with Noise, EMI, and Flaws)
    let emiSpikeX = 0;
    let emiSpikeY = 0;
    let flawSpikeX = 0;
    let flawSpikeY = 0;

    if (this.config.emiNoiseActive) {
      // Massive high frequency EMI burst
      emiSpikeX = (Math.random() - 0.5) * 65.0;
      emiSpikeY = (Math.random() - 0.5) * 65.0;
    }
    if (this.config.sensorFlawActive) {
      // Discontinuous hardware glitch
      flawSpikeX = (Math.random() > 0.5 ? 42.0 : -42.0);
      flawSpikeY = (Math.random() > 0.5 ? 38.0 : -38.0);
    }

    const sensorNoiseSigma = 1.2 + (this.config.turbulenceLevel / 100) * 3.5;
    const rawGyroX = trueRateX + this.brownianX + gaussianRandom() * sensorNoiseSigma + emiSpikeX + flawSpikeX;
    const rawGyroY = trueRateY + this.brownianY + gaussianRandom() * sensorNoiseSigma + emiSpikeY + flawSpikeY;
    const rawGyroZ = trueRateZ + this.brownianZ + gaussianRandom() * sensorNoiseSigma;

    // Accelerometer readings (Gravity vector + dynamic accelerations)
    const rollRad = (this.roll * Math.PI) / 180;
    const pitchRad = (this.pitch * Math.PI) / 180;
    const g = 9.80665;
    const rawAccelX = -g * Math.sin(pitchRad) + gustX * 0.15 + (Math.random() - 0.5) * 0.4 + (this.config.emiNoiseActive ? (Math.random() - 0.5) * 6 : 0);
    const rawAccelY = g * Math.sin(rollRad) * Math.cos(pitchRad) + gustY * 0.15 + (Math.random() - 0.5) * 0.4 + (this.config.emiNoiseActive ? (Math.random() - 0.5) * 6 : 0);
    const rawAccelZ = g * Math.cos(rollRad) * Math.cos(pitchRad) + gustZ * 0.15 + (Math.random() - 0.5) * 0.4;

    // 5. Discrete Kalman Filter Step (with Brownian Prediction Feed-Forward)
    // Pre-compensate gyro rate using firmware Brownian drift model
    const compensatedGyroX = rawGyroX - this.predictedDriftX;
    const compensatedGyroY = rawGyroY - this.predictedDriftY;

    // Accel angles for measurement update
    const accelRoll = (Math.atan2(rawAccelY, rawAccelZ) * 180) / Math.PI;
    const accelPitch = (Math.atan2(-rawAccelX, Math.sqrt(rawAccelY * rawAccelY + rawAccelZ * rawAccelZ)) * 180) / Math.PI;

    // Filter Roll
    const kfResultRoll = this.stepKalman(
      this.kfRoll,
      compensatedGyroX,
      accelRoll,
      dt,
      this.kalmanParams.processNoiseQ,
      this.kalmanParams.measurementNoiseR
    );
    this.kfRoll = kfResultRoll.state;

    // Filter Pitch
    const kfResultPitch = this.stepKalman(
      this.kfPitch,
      compensatedGyroY,
      accelPitch,
      dt,
      this.kalmanParams.processNoiseQ,
      this.kalmanParams.measurementNoiseR
    );
    this.kfPitch = kfResultPitch.state;

    // Yaw gyro integration
    this.kfYaw.angle = (this.kfYaw.angle + (rawGyroZ - this.predictedDriftZ) * dt + 360) % 360;

    // Innovation residual calculation
    const innovationRoll = kfResultRoll.innovation;
    const innovationPitch = kfResultPitch.innovation;
    const innovationMagnitude = Math.sqrt(innovationRoll * innovationRoll + innovationPitch * innovationPitch);

    // 6. Intensified Period-Captured Triggering
    // Threshold check: when disturbance or flaw causes innovation to exceed threshold
    const tripCondition =
      innovationMagnitude > this.config.innovationThreshold ||
      this.config.emiNoiseActive ||
      this.config.sensorFlawActive;

    if (tripCondition) {
      this.burstActive = true;
      this.burstTimerMs = this.config.burstDurationMs;
      this.samplingRateHz = 1000;
    } else if (this.burstActive) {
      this.burstTimerMs -= dt * 1000;
      if (this.burstTimerMs <= 0) {
        this.burstActive = false;
        this.burstTimerMs = 0;
        this.samplingRateHz = 100;
      }
    }

    const burstProgress = this.burstActive
      ? Math.max(0, Math.min(100, (this.burstTimerMs / this.config.burstDurationMs) * 100))
      : 0;

    // 7. Sheltered Hardware Queue Packet Generation & Sealing
    const packetId = ++this.packetCounter;
    const timeMicros = Math.floor(this.flightTime * 1000000);
    const quat = this.eulerToQuaternion(this.kfRoll.angle, this.kfPitch.angle, this.kfYaw.angle);

    const packetPayload = `${packetId}:${timeMicros}:${quat.map(q => q.toFixed(4)).join(',')}`;
    const sealedCrc = crc32(packetPayload);
    const validityScore = Math.max(0.2, 1.0 - (innovationMagnitude / 60.0));

    // Push into circular buffer
    const slotIdx = packetId % this.RING_CAPACITY;
    const sramAddr = '0x' + (this.baseSramAddress + slotIdx * 32).toString(16).toUpperCase();

    const newPacket: ShelteredPacket = {
      id: packetId,
      timestampUs: timeMicros,
      sramAddress: sramAddr,
      quaternion: quat,
      angularRates: [compensatedGyroX, compensatedGyroY, rawGyroZ - this.predictedDriftZ],
      accelerations: [rawAccelX, rawAccelY, rawAccelZ],
      crc32: sealedCrc,
      isSealed: true,
      isSheltered: true,
      junction0Routed: validityScore > 0.45,
      priorityLevel: this.burstActive ? 0 : 3,
      validityScore: Math.min(1.0, Math.max(0.0, validityScore)),
    };

    this.shelteredRing[slotIdx] = newPacket;

    // 8. Junction 0 Core: Motor Output Calculation (PID Quadrotor Mixer)
    // Even in severe EMI, Junction 0 relies on sheltered packets and Kalman state
    const rollError = cmdRoll - this.kfRoll.angle;
    const pitchError = cmdPitch - this.kfPitch.angle;
    const baseThrottle = 58.0; // %

    // Motor 1: Front-Left (CW)
    const m1 = Math.max(10, Math.min(95, baseThrottle + pitchError * 0.8 - rollError * 0.8));
    // Motor 2: Front-Right (CCW)
    const m2 = Math.max(10, Math.min(95, baseThrottle + pitchError * 0.8 + rollError * 0.8));
    // Motor 3: Rear-Left (CCW)
    const m3 = Math.max(10, Math.min(95, baseThrottle - pitchError * 0.8 - rollError * 0.8));
    // Motor 4: Rear-Right (CW)
    const m4 = Math.max(10, Math.min(95, baseThrottle - pitchError * 0.8 + rollError * 0.8));

    const stabilityIndex = Math.max(15, Math.min(100, 100 - (innovationMagnitude * 1.8)));

    const captureMode = this.burstActive
      ? 'INTENSIFIED_BURST'
      : (this.config.sensorFlawActive || this.config.emiNoiseActive ? 'RECOVERY' : 'NOMINAL');

    return {
      timestamp: Math.floor(this.flightTime * 1000),
      timeMicros,
      trueRoll: this.roll,
      truePitch: this.pitch,
      trueYaw: this.yaw,
      trueAltitude: this.altitude,
      trueAirspeed: this.airspeed,
      rawGyroX,
      rawGyroY,
      rawGyroZ,
      rawAccelX,
      rawAccelY,
      rawAccelZ,
      brownianDriftX: this.brownianX,
      brownianDriftY: this.brownianY,
      brownianDriftZ: this.brownianZ,
      predictedDriftX: this.predictedDriftX,
      predictedDriftY: this.predictedDriftY,
      predictedDriftZ: this.predictedDriftZ,
      filteredRoll: this.kfRoll.angle,
      filteredPitch: this.kfPitch.angle,
      filteredYaw: this.kfYaw.angle,
      rollUncertainty: Math.sqrt(this.kfRoll.P[0][0]) * 3.0,
      pitchUncertainty: Math.sqrt(this.kfPitch.P[0][0]) * 3.0,
      yawUncertainty: Math.sqrt(this.kfYaw.P[0][0]) * 3.0,
      innovationRoll,
      innovationPitch,
      innovationMagnitude,
      samplingRateHz: this.samplingRateHz,
      captureMode,
      burstActive: this.burstActive,
      burstProgress,
      shelteredQueueCount: this.shelteredRing.length,
      junction0Active: true,
      junction0Stability: stabilityIndex,
      actuatorOutputs: [m1, m2, m3, m4],
    };
  }

  public getShelteredQueue(): ShelteredPacket[] {
    return [...this.shelteredRing].sort((a, b) => b.id - a.id);
  }

  // Helper: Euler angles to Quaternion [qw, qx, qy, qz]
  private eulerToQuaternion(rollDeg: number, pitchDeg: number, yawDeg: number): [number, number, number, number] {
    const r = (rollDeg * Math.PI) / 360;
    const p = (pitchDeg * Math.PI) / 360;
    const y = (yawDeg * Math.PI) / 360;

    const cr = Math.cos(r);
    const sr = Math.sin(r);
    const cp = Math.cos(p);
    const sp = Math.sin(p);
    const cy = Math.cos(y);
    const sy = Math.sin(y);

    const qw = cr * cp * cy + sr * sp * sy;
    const qx = sr * cp * cy - cr * sp * sy;
    const qy = cr * sp * cy + sr * cp * sy;
    const qz = cr * cp * sy - sr * sp * cy;

    return [qw, qx, qy, qz];
  }

  // Discrete Kalman Filter Step (Linear 1D for angle & gyro bias)
  private stepKalman(
    state: { angle: number; bias: number; P: number[][] },
    rate: number,
    measurement: number,
    dt: number,
    Q_angle: number,
    R_measure: number
  ): { state: { angle: number; bias: number; P: number[][] }; innovation: number } {
    // 1. Time Update (Prediction)
    const rateUnbiased = rate - state.bias;
    const predictedAngle = state.angle + dt * rateUnbiased;

    // Error covariance update: P = F*P*F' + Q
    const P00 = state.P[0][0] + dt * (dt * state.P[1][1] - state.P[0][1] - state.P[1][0] + Q_angle);
    const P01 = state.P[0][1] - dt * state.P[1][1];
    const P10 = state.P[1][0] - dt * state.P[1][1];
    const P11 = state.P[1][1] + (Q_angle * 0.1) * dt;

    // 2. Measurement Update (Innovation)
    const innovation = measurement - predictedAngle; // y_k = z_k - H*x
    const S = P00 + R_measure; // Innovation covariance
    const K0 = P00 / S; // Kalman gain
    const K1 = P10 / S;

    const updatedAngle = predictedAngle + K0 * innovation;
    const updatedBias = state.bias + K1 * innovation;

    const newP00 = P00 - K0 * P00;
    const newP01 = P01 - K0 * P01;
    const newP10 = P10 - K1 * P00;
    const newP11 = P11 - K1 * P01;

    return {
      state: {
        angle: updatedAngle,
        bias: updatedBias,
        P: [
          [newP00, newP01],
          [newP10, newP11],
        ],
      },
      innovation,
    };
  }
}

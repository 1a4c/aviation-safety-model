/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TelemetryFrame {
  timestamp: number; // ms
  timeMicros: number; // us
  
  // Ground truth flight physics
  trueRoll: number; // degrees
  truePitch: number; // degrees
  trueYaw: number; // degrees
  trueAltitude: number; // meters
  trueAirspeed: number; // m/s
  
  // Raw noisy sensors (with Brownian drift & turbulence)
  rawGyroX: number; // deg/s
  rawGyroY: number; // deg/s
  rawGyroZ: number; // deg/s
  rawAccelX: number; // m/s^2
  rawAccelY: number; // m/s^2
  rawAccelZ: number; // m/s^2
  
  // Brownian drift state
  brownianDriftX: number; // deg/s
  brownianDriftY: number; // deg/s
  brownianDriftZ: number; // deg/s
  predictedDriftX: number; // deg/s
  predictedDriftY: number; // deg/s
  predictedDriftZ: number; // deg/s
  
  // Discrete Kalman Filter filtered attitude
  filteredRoll: number; // degrees
  filteredPitch: number; // degrees
  filteredYaw: number; // degrees
  rollUncertainty: number; // +/- degrees (3-sigma)
  pitchUncertainty: number; // +/- degrees
  yawUncertainty: number; // +/- degrees
  
  // Innovation residual
  innovationRoll: number;
  innovationPitch: number;
  innovationMagnitude: number;
  
  // Sampling & Capture mode
  samplingRateHz: number; // 100 or 1000 Hz
  captureMode: 'NOMINAL' | 'INTENSIFIED_BURST' | 'RECOVERY';
  burstActive: boolean;
  burstProgress: number; // 0 - 100%
  
  // Sheltered Queue & Junction 0
  shelteredQueueCount: number;
  junction0Active: boolean;
  junction0Stability: number; // 0 - 100%
  actuatorOutputs: [number, number, number, number]; // 4 rotor throttle percentages (0-100)
}

export interface ShelteredPacket {
  id: number;
  timestampUs: number;
  sramAddress: string;
  quaternion: [number, number, number, number]; // [qw, qx, qy, qz]
  angularRates: [number, number, number]; // [wx, wy, wz] in deg/s
  accelerations: [number, number, number]; // [ax, ay, az] in m/s^2
  crc32: string;
  isSealed: boolean;
  isSheltered: boolean;
  junction0Routed: boolean;
  priorityLevel: number; // 0 (highest) - 7 (nominal)
  validityScore: number; // 0.0 - 1.0
}

export interface DisturbanceConfig {
  turbulenceLevel: number; // 0 to 100 (Dryden turbulence model)
  brownianDiffusionCoeff: number; // 0.01 to 0.5 (Drift rate)
  emiNoiseActive: boolean;
  windShearAngle: number; // degrees 0-360
  windShearSpeed: number; // m/s
  sensorFlawActive: boolean;
  innovationThreshold: number; // deg/s for triggering intensified capture
  burstDurationMs: number; // duration of intensified burst
}

export interface KalmanFilterParams {
  processNoiseQ: number; // gyro variance
  measurementNoiseR: number; // accel variance
  driftPredictorWeight: number; // Brownian weight (0.0 - 1.0)
}

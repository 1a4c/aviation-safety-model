/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TelemetryFrame } from '../types/avionics';
import { ShieldCheck, Compass, Gauge, AlertTriangle, Activity } from 'lucide-react';

interface Props {
  telemetry: TelemetryFrame;
  burstActive: boolean;
}

export const PrimaryFlightDisplay: React.FC<Props> = ({ telemetry, burstActive }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const droneGroupRef = useRef<THREE.Group | null>(null);
  const rotorsRef = useRef<THREE.Mesh[]>([]);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Initialize Three.js 3D UAV Airframe scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 340;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 5.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    container.replaceChildren(renderer.domElement);

    // Ambient & directional lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    sunLight.position.set(5, 10, 7);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.2);
    rimLight.position.set(-5, -3, -5);
    scene.add(rimLight);

    // Build Quadrotor Drone Model
    const drone = new THREE.Group();
    droneGroupRef.current = drone;

    // Central fuselage
    const bodyGeo = new THREE.BoxGeometry(0.8, 0.22, 1.1);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.8,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    drone.add(body);

    // Avionics shielded core (TCM SRAM & Junction 0 enclosure)
    const coreGeo = new THREE.BoxGeometry(0.45, 0.16, 0.45);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x083344,
      roughness: 0.1,
      metalness: 0.9,
    });
    const coreBox = new THREE.Mesh(coreGeo, coreMat);
    coreBox.position.set(0, 0.18, 0);
    drone.add(coreBox);

    // 4 Carbon-fiber arms (X-frame quadcopter)
    const armMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.6,
    });

    const armGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.8, 12);
    const arm1 = new THREE.Mesh(armGeo, armMat);
    arm1.rotation.z = Math.PI / 2;
    arm1.rotation.y = Math.PI / 4;
    drone.add(arm1);

    const arm2 = new THREE.Mesh(armGeo, armMat);
    arm2.rotation.z = Math.PI / 2;
    arm2.rotation.y = -Math.PI / 4;
    drone.add(arm2);

    // 4 Motor pods and rotors
    const rotorMeshes: THREE.Mesh[] = [];
    const motorCoords = [
      { x: 0.64, z: -0.64, color: 0x10b981 }, // FL (Starboard Front - Green LED)
      { x: -0.64, z: -0.64, color: 0xef4444 }, // FR (Port Front - Red LED)
      { x: 0.64, z: 0.64, color: 0x38bdf8 }, // RL (Starboard Rear)
      { x: -0.64, z: 0.64, color: 0x38bdf8 }, // RR (Port Rear)
    ];

    const motorGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.18, 16);
    const motorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
    const bladeGeo = new THREE.BoxGeometry(0.75, 0.015, 0.07);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.75,
    });

    motorCoords.forEach((coord) => {
      const motor = new THREE.Mesh(motorGeo, motorMat);
      motor.position.set(coord.x, 0.08, coord.z);
      drone.add(motor);

      // Nav LED
      const ledGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const ledMat = new THREE.MeshBasicMaterial({ color: coord.color });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(coord.x, 0.18, coord.z);
      drone.add(led);

      // Spinning rotor blade
      const rotor = new THREE.Mesh(bladeGeo, bladeMat);
      rotor.position.set(coord.x, 0.2, coord.z);
      drone.add(rotor);
      rotorMeshes.push(rotor);
    });
    rotorsRef.current = rotorMeshes;

    // Coordinate grid ring below drone
    const ringGeo = new THREE.RingGeometry(1.6, 1.62, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.5;
    scene.add(ring);

    // Crosshairs
    const lineMat = new THREE.LineBasicMaterial({ color: 0x334155 });
    const pointsX = [new THREE.Vector3(-2, -0.5, 0), new THREE.Vector3(2, -0.5, 0)];
    const pointsZ = [new THREE.Vector3(0, -0.5, -2), new THREE.Vector3(0, -0.5, 2)];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsX), lineMat));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsZ), lineMat));

    scene.add(drone);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Spin rotors according to sampling rate
      const rotorSpeed = burstActive ? 0.45 : 0.22;
      rotorsRef.current.forEach((rotor, idx) => {
        rotor.rotation.y += (idx % 2 === 0 ? 1 : -1) * rotorSpeed;
      });

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update drone rotation when telemetry changes
  useEffect(() => {
    if (droneGroupRef.current) {
      // Roll (X), Pitch (Z in 3D scene space), Yaw (Y)
      droneGroupRef.current.rotation.x = (telemetry.filteredPitch * Math.PI) / 180;
      droneGroupRef.current.rotation.z = -(telemetry.filteredRoll * Math.PI) / 180;
      droneGroupRef.current.rotation.y = -(telemetry.filteredYaw * Math.PI) / 180;
    }
  }, [telemetry.filteredRoll, telemetry.filteredPitch, telemetry.filteredYaw]);

  // Pitch ladder offsets
  const pitchPixelsPerDegree = 3.6;
  const rollAngleDeg = telemetry.filteredRoll;
  const pitchAngleDeg = telemetry.filteredPitch;

  return (
    <div className="space-y-4">
      {/* Flight HUD & 3D Drone Viewport Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main PFD Artificial Horizon & Flight HUD (8 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden relative shadow-lg">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-semibold tracking-wider text-slate-200 uppercase">
                航太主飛行顯示器 (Primary Flight Display)
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-400">姿態核心:</span>
              <span className="text-emerald-400 font-bold">JUNCTION-0</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">卡爾曼融合:</span>
              <span className="text-cyan-400 font-bold">ONLINE</span>
            </div>
          </div>

          {/* Artificial Horizon Screen */}
          <div className="relative h-[340px] w-full overflow-hidden bg-slate-950 flex items-center justify-center select-none">
            {/* Horizon Sky & Ground Rotating Layer */}
            <div
              className="absolute w-[800px] h-[800px] transition-transform duration-75 ease-out"
              style={{
                transform: `rotate(${-rollAngleDeg}deg) translateY(${pitchAngleDeg * pitchPixelsPerDegree}px)`,
              }}
            >
              {/* Sky Upper Half */}
              <div className="w-full h-1/2 bg-gradient-to-t from-sky-900/60 to-slate-900 border-b border-cyan-400/80" />
              {/* Ground Lower Half */}
              <div className="w-full h-1/2 bg-gradient-to-b from-amber-950/40 to-slate-950" />

              {/* Pitch Ladder Marks (+30, +20, +10, 0, -10, -20, -30) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {[-30, -20, -10, 0, 10, 20, 30].map((deg) => (
                  <div
                    key={deg}
                    className="absolute flex items-center justify-center font-mono text-[10px] text-cyan-300"
                    style={{
                      transform: `translateY(${-deg * pitchPixelsPerDegree}px)`,
                    }}
                  >
                    {deg === 0 ? (
                      <div className="w-48 h-[1.5px] bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-cyan-400/80">{Math.abs(deg)}</span>
                        <div
                          className={`h-[1px] bg-cyan-400/60 ${
                            Math.abs(deg) % 20 === 0 ? 'w-24' : 'w-14'
                          }`}
                        />
                        <span className="tabular-nums text-cyan-400/80">{Math.abs(deg)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Static Aircraft Fixed Crosshair Symbol */}
            <div className="absolute pointer-events-none z-20 flex items-center justify-center">
              {/* Center Dot */}
              <div className="w-2 h-2 rounded-full bg-amber-400 border border-slate-950 shadow-sm" />
              {/* Left Wing Bar */}
              <div className="absolute right-4 w-10 h-[2.5px] bg-amber-400 shadow-sm" />
              {/* Right Wing Bar */}
              <div className="absolute left-4 w-10 h-[2.5px] bg-amber-400 shadow-sm" />
              {/* Inverted V Piper */}
              <div className="absolute -top-3 w-3 h-3 border-t-2 border-r-2 border-amber-400 rotate-45" />
            </div>

            {/* Roll Bank Angle Index Arc at Top */}
            <div className="absolute top-3 pointer-events-none z-20 flex flex-col items-center">
              <div className="relative w-44 h-12 flex justify-center">
                <svg className="w-44 h-12 overflow-visible" viewBox="0 0 160 50">
                  <path
                    d="M 20 45 A 60 60 0 0 1 140 45"
                    fill="none"
                    stroke="rgba(148, 163, 184, 0.4)"
                    strokeWidth="1.5"
                  />
                  {/* Bank Angle Ticks (-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60) */}
                  {[-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60].map((angle) => {
                    const rad = ((angle - 90) * Math.PI) / 180;
                    const r1 = 60;
                    const r2 = angle % 30 === 0 ? 52 : 55;
                    const x1 = 80 + r1 * Math.cos(rad);
                    const y1 = 70 + r1 * Math.sin(rad);
                    const x2 = 80 + r2 * Math.cos(rad);
                    const y2 = 70 + r2 * Math.sin(rad);
                    return (
                      <line
                        key={angle}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="rgba(6, 182, 212, 0.8)"
                        strokeWidth={angle === 0 ? 2 : 1}
                      />
                    );
                  })}
                  {/* Dynamic Roll Pointer */}
                  <polygon
                    points="77,22 83,22 80,14"
                    fill="#38bdf8"
                    transform={`rotate(${rollAngleDeg}, 80, 70)`}
                  />
                </svg>
              </div>
            </div>

            {/* Airspeed Tape Overlay (Left Edge) */}
            <div className="absolute left-3 top-10 bottom-10 w-16 bg-slate-900/80 border border-slate-800 rounded p-1.5 flex flex-col items-center justify-between font-mono text-[11px] z-20 backdrop-blur-sm">
              <span className="text-[9px] uppercase tracking-wider text-slate-400">空速 IAS</span>
              <div className="text-center">
                <span className="text-base font-bold text-white tabular-nums">
                  {telemetry.trueAirspeed.toFixed(1)}
                </span>
                <span className="block text-[9px] text-slate-400">m/s</span>
              </div>
              <div className="text-[10px] text-slate-400 tabular-nums">
                {(telemetry.trueAirspeed * 1.944).toFixed(0)} <span className="text-[8px]">KTS</span>
              </div>
            </div>

            {/* Altitude Tape Overlay (Right Edge) */}
            <div className="absolute right-3 top-10 bottom-10 w-16 bg-slate-900/80 border border-slate-800 rounded p-1.5 flex flex-col items-center justify-between font-mono text-[11px] z-20 backdrop-blur-sm">
              <span className="text-[9px] uppercase tracking-wider text-slate-400">氣壓高度</span>
              <div className="text-center">
                <span className="text-base font-bold text-cyan-300 tabular-nums">
                  {telemetry.trueAltitude.toFixed(1)}
                </span>
                <span className="block text-[9px] text-slate-400">ALT (m)</span>
              </div>
              <div className="text-[10px] text-slate-400 tabular-nums">
                {(telemetry.trueAltitude * 3.2808).toFixed(0)} <span className="text-[8px]">FT</span>
              </div>
            </div>

            {/* Heading Compass Tape (Bottom Edge) */}
            <div className="absolute bottom-2 inset-x-24 h-9 bg-slate-900/90 border border-slate-800 rounded px-3 flex items-center justify-between font-mono z-20 backdrop-blur-sm">
              <span className="text-[10px] text-slate-400">HDG 航向</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tabular-nums">
                  {Math.round(telemetry.filteredYaw).toString().padStart(3, '0')}°
                </span>
                <span className="text-xs text-cyan-400 font-semibold">
                  {telemetry.filteredYaw < 45 || telemetry.filteredYaw >= 315
                    ? 'N'
                    : telemetry.filteredYaw < 135
                    ? 'E'
                    : telemetry.filteredYaw < 225
                    ? 'S'
                    : 'W'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                ±{telemetry.yawUncertainty.toFixed(1)}°
              </span>
            </div>
          </div>

          {/* Bottom Telemetry Status Strip */}
          <div className="p-3 bg-slate-950/60 border-t border-slate-800 grid grid-cols-3 gap-2 text-xs font-mono">
            <div>
              <span className="text-slate-400 text-[10px] block">滾轉 ROLL (Φ)</span>
              <span className="text-sm font-semibold text-white tabular-nums">
                {telemetry.filteredRoll.toFixed(2)}°
              </span>
              <span className="text-[10px] text-slate-400 ml-1">
                (±{telemetry.rollUncertainty.toFixed(2)}°)
              </span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] block">俯仰 PITCH (θ)</span>
              <span className="text-sm font-semibold text-white tabular-nums">
                {telemetry.filteredPitch.toFixed(2)}°
              </span>
              <span className="text-[10px] text-slate-400 ml-1">
                (±{telemetry.pitchUncertainty.toFixed(2)}°)
              </span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] block">殘差 INNOVATION</span>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  telemetry.innovationMagnitude > 12.0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {telemetry.innovationMagnitude.toFixed(2)}°/s
              </span>
            </div>
          </div>
        </div>

        {/* 3D UAV Airframe Interactive Viewport (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-semibold tracking-wider text-slate-200 uppercase">
                3D 無人機姿態與旋翼動態
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              WebGL 姿態連動
            </span>
          </div>

          {/* Three.js Container */}
          <div
            ref={mountRef}
            className="w-full h-[250px] relative rounded bg-slate-950/80 border border-slate-800/80 my-2 overflow-hidden flex items-center justify-center"
          >
            {/* Live Indicator overlay in 3D frame */}
            <div className="absolute top-2 left-2 z-10 text-[10px] font-mono bg-slate-900/90 border border-slate-800 rounded px-2 py-0.5 text-slate-300">
              姿態座標: X: {telemetry.filteredPitch.toFixed(1)}° | Z: {telemetry.filteredRoll.toFixed(1)}°
            </div>
          </div>

          {/* 4 Motors RPM & Junction 0 Flight Command */}
          <div className="space-y-2 pt-2 border-t border-slate-800 font-mono text-xs">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>控制核心 Junction 0 姿態解算:</span>
              </span>
              <span className="font-semibold text-cyan-400 tabular-nums">
                穩定度 {telemetry.junction0Stability.toFixed(0)}%
              </span>
            </div>

            {/* 4-Motor Throttle Bars */}
            <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
              {telemetry.actuatorOutputs.map((thrust, idx) => (
                <div key={idx} className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block mb-1">M{idx + 1} {idx < 2 ? '前' : '後'}{idx % 2 === 0 ? '左' : '右'}</span>
                  <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden my-1">
                    <div
                      className="h-full bg-cyan-400 rounded transition-all duration-75"
                      style={{ width: `${thrust}%` }}
                    />
                  </div>
                  <span className="text-white font-semibold tabular-nums">{thrust.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Strip: Raw Unfiltered Noise vs. Filtered Attitude */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
              感測器抗噪效能比較 (Sensor Anti-Drift Mitigation Matrix)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-400">目前模式:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              burstActive ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
            }`}>
              {burstActive ? '強化捕獲 (1000 Hz 突發)' : '常態觀測 (100 Hz)'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Card 1: Raw Sensor with Brownian Drift */}
          <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-2">
              <span className="flex items-center gap-1 text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>原始感測器 (含布朗漂移)</span>
              </span>
              <span className="text-[10px] text-slate-400">未補償</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">陀螺儀 X 軸:</span>
                <span className="text-rose-300 font-semibold tabular-nums">{telemetry.rawGyroX.toFixed(2)} °/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">布朗運動漂移累積:</span>
                <span className="text-rose-400 font-semibold tabular-nums">+{telemetry.brownianDriftX.toFixed(2)} °/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">瞬態雜訊尖波:</span>
                <span className="text-slate-400 tabular-nums">±{(Math.abs(telemetry.rawGyroX - telemetry.trueRoll * 0.1)).toFixed(1)} °/s</span>
              </div>
            </div>
          </div>

          {/* Card 2: Brownianized Setting Predictor */}
          <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-2">
              <span className="text-cyan-400 font-semibold">布朗漂移預測模型 (韌體底層)</span>
              <span className="text-[10px] text-cyan-500">前饋估算</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">X 軸漂移預測值:</span>
                <span className="text-cyan-300 font-semibold tabular-nums">+{telemetry.predictedDriftX.toFixed(2)} °/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">前饋消除率:</span>
                <span className="text-emerald-400 font-semibold tabular-nums">
                  {Math.min(99.2, Math.max(75, 100 - Math.abs(telemetry.brownianDriftX - telemetry.predictedDriftX) * 5)).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">漂移殘留微差:</span>
                <span className="text-slate-300 tabular-nums">
                  {(telemetry.brownianDriftX - telemetry.predictedDriftX).toFixed(3)} °/s
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Discrete Kalman Filter Calibrated Output */}
          <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-2">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>離散卡爾曼校準輸出</span>
              </span>
              <span className="text-[10px] text-emerald-400">高精度姿態</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">滾轉角 (Roll):</span>
                <span className="text-white font-bold tabular-nums">{telemetry.filteredRoll.toFixed(2)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">與真實姿態誤差:</span>
                <span className="text-emerald-300 font-semibold tabular-nums">
                  Δ {Math.abs(telemetry.filteredRoll - telemetry.trueRoll).toFixed(3)}°
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">抗噪增益信噪比:</span>
                <span className="text-cyan-300 font-semibold tabular-nums">+24.8 dB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

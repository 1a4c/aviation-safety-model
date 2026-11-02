/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AvionicsEngine } from './lib/avionicsEngine';
import { TelemetryFrame, ShelteredPacket, DisturbanceConfig, KalmanFilterParams } from './types/avionics';
import { AvionicsHeader } from './components/AvionicsHeader';
import { PrimaryFlightDisplay } from './components/PrimaryFlightDisplay';
import { BrownianDriftScope } from './components/BrownianDriftScope';
import { ShelteredQueueInspector } from './components/ShelteredQueueInspector';
import { KalmanMatrixVisualizer } from './components/KalmanMatrixVisualizer';
import { FirmwareDecompiler } from './components/FirmwareDecompiler';
import { DisturbanceControls } from './components/DisturbanceControls';
import { Activity, ShieldCheck, Zap } from 'lucide-react';

export default function App() {
  const engineRef = useRef<AvionicsEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new AvionicsEngine();
  }

  const [activeTab, setActiveTab] = useState<'pfd' | 'brownian' | 'queue' | 'kalman' | 'firmware'>('pfd');
  const [telemetry, setTelemetry] = useState<TelemetryFrame>(() => engineRef.current!.update(0.016));
  const [shelteredPackets, setShelteredPackets] = useState<ShelteredPacket[]>(() =>
    engineRef.current!.getShelteredQueue()
  );
  const [config, setConfig] = useState<DisturbanceConfig>(() => engineRef.current!.getConfig());
  const [kalmanParams, setKalmanParams] = useState<KalmanFilterParams>(() =>
    engineRef.current!.getKalmanParams()
  );

  // Simulation physics loop (60 FPS tick)
  useEffect(() => {
    let lastTime = performance.now();
    let animId: number;
    let packetTimer = 0;

    const loop = (currentTime: number) => {
      animId = requestAnimationFrame(loop);
      const dtMs = currentTime - lastTime;
      lastTime = currentTime;

      // Cap dt to prevent huge jumps on tab switch
      const dt = Math.min(0.05, Math.max(0.005, dtMs / 1000));
      const frame = engineRef.current!.update(dt);
      setTelemetry(frame);

      packetTimer += dt;
      if (packetTimer > 0.08) {
        // Update sheltered packet list at ~12Hz for UI efficiency
        packetTimer = 0;
        setShelteredPackets(engineRef.current!.getShelteredQueue());
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleUpdateConfig = (newCfg: Partial<DisturbanceConfig>) => {
    engineRef.current!.setConfig(newCfg);
    setConfig(engineRef.current!.getConfig());
  };

  const handleUpdateKalmanParams = (newParams: Partial<KalmanFilterParams>) => {
    engineRef.current!.setKalmanParams(newParams);
    setKalmanParams(engineRef.current!.getKalmanParams());
  };

  const handleTriggerBurst = () => {
    engineRef.current!.triggerManualBurst();
  };

  const handleInjectEmi = () => {
    engineRef.current!.injectEmiPulse();
    handleUpdateConfig({ emiNoiseActive: true });
  };

  const handleInjectFlaw = () => {
    engineRef.current!.injectTransientFlaw();
    handleUpdateConfig({ sensorFlawActive: true });
  };

  const handleSetTargetAttitude = (roll: number, pitch: number) => {
    engineRef.current!.setTargetAttitude(roll, pitch);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 3-Zone Top Bar Contract */}
      <AvionicsHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        burstActive={telemetry.burstActive}
        samplingRateHz={telemetry.samplingRateHz}
        onTriggerBurst={handleTriggerBurst}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Top Operational Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Activity className="w-3.5 h-3.5" />
              <span className="font-semibold">韌體運行中</span>
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">
              時間戳: <span className="text-slate-200 tabular-nums">{(telemetry.timestamp / 1000).toFixed(2)}s</span>
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">
              狀態: <span className={`font-semibold ${telemetry.burstActive ? 'text-amber-400' : 'text-emerald-400'}`}>{telemetry.captureMode}</span>
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Junction 0: 姿態保護有效</span>
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline">
              取樣週期: <span className="text-cyan-300 font-bold tabular-nums">{telemetry.samplingRateHz} Hz</span>
            </span>
          </div>
        </div>

        {/* Tab Content Display */}
        {activeTab === 'pfd' && (
          <PrimaryFlightDisplay
            telemetry={telemetry}
            burstActive={telemetry.burstActive}
          />
        )}

        {activeTab === 'brownian' && (
          <BrownianDriftScope
            telemetry={telemetry}
            config={config}
            onUpdateConfig={handleUpdateConfig}
            onTriggerBurst={handleTriggerBurst}
          />
        )}

        {activeTab === 'queue' && (
          <ShelteredQueueInspector
            packets={shelteredPackets}
            telemetry={telemetry}
            burstActive={telemetry.burstActive}
          />
        )}

        {activeTab === 'kalman' && (
          <KalmanMatrixVisualizer
            telemetry={telemetry}
            kalmanParams={kalmanParams}
            onUpdateParams={handleUpdateKalmanParams}
          />
        )}

        {activeTab === 'firmware' && <FirmwareDecompiler />}

        {/* Disturbance & Fault Injection Lab (Always present for instant stress testing) */}
        <DisturbanceControls
          config={config}
          onUpdateConfig={handleUpdateConfig}
          onInjectEmi={handleInjectEmi}
          onInjectFlaw={handleInjectFlaw}
          onTriggerBurst={handleTriggerBurst}
          onSetTargetAttitude={handleSetTargetAttitude}
        />
      </main>

      {/* Clean Unboxed Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400">
          <div>
            <span>航太與無人機導航控制韌體 (Avionics & UAV Guidance Firmware)</span>
            <span className="mx-2">·</span>
            <span>布朗漂移前饋 (Brownianized)</span>
            <span className="mx-2">·</span>
            <span>強化捕獲 (Intensified Period-Captured)</span>
            <span className="mx-2">·</span>
            <span>受保護佇列 (Sheltered Queue)</span>
          </div>
          <div>
            <span>控制核心 Junction 0 // MISRA-C++ RTOS Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

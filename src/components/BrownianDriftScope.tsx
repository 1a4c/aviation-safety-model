/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { TelemetryFrame, DisturbanceConfig } from '../types/avionics';
import { Activity, Zap, Cpu, Sliders, ShieldAlert } from 'lucide-react';

interface Props {
  telemetry: TelemetryFrame;
  config: DisturbanceConfig;
  onUpdateConfig: (cfg: Partial<DisturbanceConfig>) => void;
  onTriggerBurst: () => void;
}

export const BrownianDriftScope: React.FC<Props> = ({
  telemetry,
  config,
  onUpdateConfig,
  onTriggerBurst,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<{
    rawGyro: number[];
    predictedDrift: number[];
    filteredRate: number[];
    innovation: number[];
  }>({
    rawGyro: [],
    predictedDrift: [],
    filteredRate: [],
    innovation: [],
  });

  const MAX_POINTS = 220;

  // Append history data
  useEffect(() => {
    const h = historyRef.current;
    h.rawGyro.push(telemetry.rawGyroX);
    h.predictedDrift.push(telemetry.predictedDriftX);
    h.filteredRate.push(telemetry.filteredRoll);
    h.innovation.push(telemetry.innovationMagnitude);

    if (h.rawGyro.length > MAX_POINTS) {
      h.rawGyro.shift();
      h.predictedDrift.shift();
      h.filteredRate.shift();
      h.innovation.shift();
    }
  }, [telemetry]);

  // Draw Oscilloscope Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Background grid
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      // Oscilloscope grid lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#1e293b';

      const gridSpacingX = 40;
      const gridSpacingY = 32;

      for (let x = 0; x < width; x += gridSpacingX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = 0; y < height; y += gridSpacingY) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Center reference zero line
      const centerY = height / 2;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      // Tripwire threshold lines (+Threshold and -Threshold)
      const thresholdYOffset = (config.innovationThreshold / 50.0) * (height / 2);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, centerY - thresholdYOffset);
      ctx.lineTo(width, centerY - thresholdYOffset);
      ctx.moveTo(0, centerY + thresholdYOffset);
      ctx.lineTo(width, centerY + thresholdYOffset);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Waveforms
      const h = historyRef.current;
      const count = h.rawGyro.length;
      if (count < 2) {
        animId = requestAnimationFrame(render);
        return;
      }

      const stepX = width / (MAX_POINTS - 1);
      const scaleY = (height / 2) / 45.0; // 45 deg/s max scale

      // Trace 1: Raw Gyro (Rose/Red)
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const x = i * stepX;
        const y = centerY - h.rawGyro[i] * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Trace 2: Predicted Brownian Drift (Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const x = i * stepX;
        const y = centerY - h.predictedDrift[i] * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Trace 3: Innovation Residual (Amber filled area)
      ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let i = 0; i < count; i++) {
        const x = i * stepX;
        const y = height - (h.innovation[i] / 50.0) * (height * 0.4);
        ctx.lineTo(x, y);
      }
      ctx.lineTo((count - 1) * stepX, height);
      ctx.closePath();
      ctx.fill();

      // Trace line for innovation
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const x = i * stepX;
        const y = height - (h.innovation[i] / 50.0) * (height * 0.4);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [config.innovationThreshold]);

  return (
    <div className="space-y-4 font-mono">
      {/* Top Telemetry Banner & Capture State */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <span className="text-slate-400 block text-[10px] uppercase">捕獲週期模式 (Capture Mode)</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-base font-bold ${
              telemetry.burstActive ? 'text-amber-400' : 'text-cyan-400'
            }`}>
              {telemetry.captureMode}
            </span>
            {telemetry.burstActive && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded animate-pulse">
                BURST ACTIVE
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {telemetry.burstActive ? '高頻瞬態捕獲中' : '常規取樣守候'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <span className="text-slate-400 block text-[10px] uppercase">瞬時取樣頻率 (Sampling Rate)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-white tabular-nums">
              {telemetry.samplingRateHz}
            </span>
            <span className="text-xs text-slate-400">Hz</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            週期: Δt = {(1000 / telemetry.samplingRateHz).toFixed(1)} ms ({Math.round(1000000 / telemetry.samplingRateHz)} µs)
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <span className="text-slate-400 block text-[10px] uppercase">卡爾曼殘差 (Innovation Residual)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-2xl font-bold tabular-nums ${
              telemetry.innovationMagnitude > config.innovationThreshold
                ? 'text-rose-400'
                : 'text-emerald-400'
            }`}>
              {telemetry.innovationMagnitude.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">°/s</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            門檻限制: {config.innovationThreshold.toFixed(1)} °/s
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded p-3 flex flex-col justify-between">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">受保護硬體佇列狀態</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-emerald-400 font-bold text-sm">SHELTERED FIFO</span>
              <span className="text-xs text-slate-400">16 Slots</span>
            </div>
          </div>
          <button
            onClick={onTriggerBurst}
            className="w-full mt-2 py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded flex items-center justify-center gap-1.5 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>立即激發 1kHz 捕獲</span>
          </button>
        </div>
      </div>

      {/* Main Oscilloscope Screen */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
              布朗隨機漂移與殘差波形即時示波器 (Live Brownian Drift & Innovation Scope)
            </span>
          </div>

          {/* Trace Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-rose-500 rounded" />
              <span className="text-slate-300">原始感測器輸出 (Raw Gyro)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-cyan-400 rounded" />
              <span className="text-slate-300">韌體布朗漂移預測 (Brownianized Model)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2 bg-amber-500/50 border border-amber-500 rounded" />
              <span className="text-slate-300">創新殘差 (Innovation Tripwire)</span>
            </div>
          </div>
        </div>

        {/* Canvas Element */}
        <div className="relative mt-3 rounded overflow-hidden border border-slate-800">
          <canvas
            ref={canvasRef}
            width={940}
            height={320}
            className="w-full h-[320px] block"
          />

          {/* Scope HUD overlay labels */}
          <div className="absolute top-2 left-3 text-[10px] text-slate-400 space-y-0.5 pointer-events-none">
            <div>TIMEBASE: 10 ms/div</div>
            <div>VOLT/RATE: 10.0 °/s/div</div>
          </div>

          <div className="absolute top-2 right-3 text-[10px] text-slate-400 text-right pointer-events-none">
            <div className="text-amber-400">TRIPWIRE: {config.innovationThreshold.toFixed(1)} °/s</div>
            <div className="text-cyan-400">PREDICTOR: α=0.08 LEAKY</div>
          </div>
        </div>

        {/* Bottom Explanatory Annotation */}
        <div className="mt-3 p-3 bg-slate-950/70 rounded border border-slate-800/80 text-xs text-slate-400 leading-relaxed">
          <span className="text-cyan-400 font-semibold block mb-1">
            韌體架構運作邏輯解析 (Firmware Operational Breakdown):
          </span>
          在強烈亂流或電磁干擾環境下，IMU 陀螺儀會因隨機微觀熱雜訊產生布朗運動隨機漫步（維納過程 $W_t$），導致角度積分發生嚴重發散。
          本韌體的 <code className="text-cyan-300">brownian_standardized_setting</code> 底層模組持續評估漂移斜率並進行前饋補償。
          當環境異常尖波使卡爾曼創新殘差超越閾值時，韌體立即中斷觸發 <code className="text-amber-300">intensified_period-captured()</code>，將取樣頻率拉升至 1000 Hz，防止高頻振動在離散取樣中發生混疊（Aliasing）。
        </div>
      </div>

      {/* Control Parameters */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
            布朗漂移與強化捕獲參數設定
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          {/* Brownian Diffusion Coefficient */}
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-slate-300">布朗運動擴散係數 (σ_drift)</span>
              <span className="text-cyan-400 font-semibold tabular-nums">
                {config.brownianDiffusionCoeff.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.02"
              max="0.45"
              step="0.01"
              value={config.brownianDiffusionCoeff}
              onChange={(e) =>
                onUpdateConfig({ brownianDiffusionCoeff: parseFloat(e.target.value) })
              }
              className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              調節隨機漫步漂移發散速率
            </span>
          </div>

          {/* Innovation Tripwire Threshold */}
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-slate-300">強化捕獲觸發閾值 (Innovation Threshold)</span>
              <span className="text-amber-400 font-semibold tabular-nums">
                {config.innovationThreshold.toFixed(1)} °/s
              </span>
            </div>
            <input
              type="range"
              min="4.0"
              max="28.0"
              step="0.5"
              value={config.innovationThreshold}
              onChange={(e) =>
                onUpdateConfig({ innovationThreshold: parseFloat(e.target.value) })
              }
              className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              當殘差超過此值時觸發 1kHz 取樣
            </span>
          </div>

          {/* Burst Duration */}
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-slate-300">強化捕獲持續時間 (Burst Duration)</span>
              <span className="text-white font-semibold tabular-nums">
                {config.burstDurationMs} ms
              </span>
            </div>
            <input
              type="range"
              min="500"
              max="3500"
              step="100"
              value={config.burstDurationMs}
              onChange={(e) =>
                onUpdateConfig({ burstDurationMs: parseInt(e.target.value) })
              }
              className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              每次超標後維持高頻取樣的時間窗口
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DisturbanceConfig } from '../types/avionics';
import { Wind, Zap, AlertTriangle, Radio, Compass, RefreshCw } from 'lucide-react';

interface Props {
  config: DisturbanceConfig;
  onUpdateConfig: (cfg: Partial<DisturbanceConfig>) => void;
  onInjectEmi: () => void;
  onInjectFlaw: () => void;
  onTriggerBurst: () => void;
  onSetTargetAttitude: (roll: number, pitch: number) => void;
}

export const DisturbanceControls: React.FC<Props> = ({
  config,
  onUpdateConfig,
  onInjectEmi,
  onInjectFlaw,
  onTriggerBurst,
  onSetTargetAttitude,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
            環境大氣擾動與故障注入實驗台 (Disturbance & Fault Injection Lab)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onUpdateConfig({
                turbulenceLevel: 25,
                brownianDiffusionCoeff: 0.12,
                windShearSpeed: 6.5,
                windShearAngle: 45,
              });
              onSetTargetAttitude(0, 0);
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>重設環境</span>
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Slider 1: Atmospheric Turbulence */}
        <div className="bg-slate-950 p-3 rounded border border-slate-800">
          <div className="flex justify-between mb-1.5">
            <span className="text-slate-300">大氣亂流強度 (Dryden Gust)</span>
            <span className="text-cyan-400 font-bold tabular-nums">
              {config.turbulenceLevel}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={config.turbulenceLevel}
            onChange={(e) =>
              onUpdateConfig({ turbulenceLevel: parseInt(e.target.value) })
            }
            className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
          />
          <span className="text-[10px] text-slate-400 mt-1 block">
            {config.turbulenceLevel < 20
              ? '微風無紊流'
              : config.turbulenceLevel < 60
              ? '中度大氣擾動'
              : '極端惡劣暴風雨亂流'}
          </span>
        </div>

        {/* Slider 2: Wind Shear Speed */}
        <div className="bg-slate-950 p-3 rounded border border-slate-800">
          <div className="flex justify-between mb-1.5">
            <span className="text-slate-300">水平風切流速 (Wind Shear)</span>
            <span className="text-cyan-400 font-bold tabular-nums">
              {config.windShearSpeed.toFixed(1)} m/s
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="25"
            step="0.5"
            value={config.windShearSpeed}
            onChange={(e) =>
              onUpdateConfig({ windShearSpeed: parseFloat(e.target.value) })
            }
            className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
          />
          <span className="text-[10px] text-slate-400 mt-1 block">
            側向氣流持續施加外在傾側力矩
          </span>
        </div>

        {/* Slider 3: Target Attitude Roll */}
        <div className="bg-slate-950 p-3 rounded border border-slate-800">
          <div className="flex justify-between mb-1.5">
            <span className="text-slate-300">姿態指令: 滾轉傾角 (Roll)</span>
            <span className="text-white font-bold tabular-nums">
              手動操縱桿
            </span>
          </div>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => onSetTargetAttitude(-18, 0)}
              className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px]"
            >
              左傾 -18°
            </button>
            <button
              onClick={() => onSetTargetAttitude(0, 0)}
              className="flex-1 py-1 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/60 rounded text-[10px]"
            >
              改平 0°
            </button>
            <button
              onClick={() => onSetTargetAttitude(18, 0)}
              className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px]"
            >
              右傾 +18°
            </button>
          </div>
          <span className="text-[10px] text-slate-400 mt-1.5 block">
            測試 Junction 0 在急動翻滾時的抗干擾性
          </span>
        </div>

        {/* Instant Disturbance Actions */}
        <div className="bg-slate-950 p-3 rounded border border-slate-800 flex flex-col justify-between">
          <span className="text-slate-300 block mb-1">瞬態極限異常注入:</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onInjectEmi}
              className="py-1 px-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 rounded text-[10px] flex items-center justify-center gap-1 transition-colors"
            >
              <Radio className="w-3 h-3 text-rose-400" />
              <span>電磁脈衝 EMI</span>
            </button>

            <button
              onClick={onInjectFlaw}
              className="py-1 px-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/50 text-amber-300 rounded text-[10px] flex items-center justify-center gap-1 transition-colors"
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>尖波 flaw()</span>
            </button>

            <button
              onClick={onTriggerBurst}
              className="col-span-2 py-1 px-2 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-700/60 text-cyan-200 rounded text-[10px] flex items-center justify-center gap-1 font-bold transition-colors"
            >
              <Zap className="w-3 h-3 text-cyan-400 fill-current" />
              <span>強制切換 1kHz 強化捕獲</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

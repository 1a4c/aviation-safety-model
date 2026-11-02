/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Zap, ShieldCheck, Cpu } from 'lucide-react';

interface Props {
  activeTab: 'pfd' | 'brownian' | 'queue' | 'kalman' | 'firmware';
  setActiveTab: (tab: 'pfd' | 'brownian' | 'queue' | 'kalman' | 'firmware') => void;
  burstActive: boolean;
  samplingRateHz: number;
  onTriggerBurst: () => void;
}

export const AvionicsHeader: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  burstActive,
  samplingRateHz,
  onTriggerBurst,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-50">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black text-sm shadow-sm shadow-cyan-500/20">
          <Cpu className="w-4 h-4 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-white font-mono">
            AVIONICS-FIRMWARE
          </span>
          <span className="hidden lg:inline text-xs text-slate-400 font-mono ml-2">
            CORE-0 // SENS-BURST-v2
          </span>
        </div>
      </div>

      {/* Zone 2: Single-line clean navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('pfd')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 text-xs font-mono tracking-wide ${
            activeTab === 'pfd'
              ? 'text-cyan-400 border-cyan-400'
              : 'border-transparent text-slate-400'
          }`}
        >
          姿態儀與3D儀表 (PFD)
        </button>

        <button
          onClick={() => setActiveTab('brownian')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 text-xs font-mono tracking-wide ${
            activeTab === 'brownian'
              ? 'text-cyan-400 border-cyan-400'
              : 'border-transparent text-slate-400'
          }`}
        >
          布朗漂移與頻率示波器
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 text-xs font-mono tracking-wide ${
            activeTab === 'queue'
              ? 'text-cyan-400 border-cyan-400'
              : 'border-transparent text-slate-400'
          }`}
        >
          受保護佇列 (Sheltered FIFO)
        </button>

        <button
          onClick={() => setActiveTab('kalman')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 text-xs font-mono tracking-wide ${
            activeTab === 'kalman'
              ? 'text-cyan-400 border-cyan-400'
              : 'border-transparent text-slate-400'
          }`}
        >
          離散卡爾曼矩陣
        </button>

        <button
          onClick={() => setActiveTab('firmware')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 text-xs font-mono tracking-wide ${
            activeTab === 'firmware'
              ? 'text-cyan-400 border-cyan-400'
              : 'border-transparent text-slate-400'
          }`}
        >
          偽代碼與HAL驅動
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="text-slate-500">取樣率:</span>
          <span className={`font-semibold tabular-nums ${burstActive ? 'text-amber-400 animate-pulse' : 'text-cyan-400'}`}>
            {samplingRateHz} Hz
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Junction 0 鎖定</span>
          </span>
        </div>

        <button
          onClick={onTriggerBurst}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded font-mono transition-all duration-150 whitespace-nowrap shrink-0 ${
            burstActive
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm shadow-cyan-500/20'
          }`}
        >
          <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{burstActive ? '強化捕獲中 (1kHz)' : '觸發強化捕獲'}</span>
        </button>
      </div>
    </header>
  );
};

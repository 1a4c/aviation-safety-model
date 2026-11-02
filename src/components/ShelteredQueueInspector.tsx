/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShelteredPacket, TelemetryFrame } from '../types/avionics';
import { ShieldCheck, Lock, Cpu, Database, CheckCircle2, AlertOctagon, Terminal } from 'lucide-react';

interface Props {
  packets: ShelteredPacket[];
  telemetry: TelemetryFrame;
  burstActive: boolean;
}

export const ShelteredQueueInspector: React.FC<Props> = ({
  packets,
  telemetry,
  burstActive,
}) => {
  const [selectedPacket, setSelectedPacket] = useState<ShelteredPacket | null>(null);

  // Active packet to inspect (either clicked or latest)
  const inspected = selectedPacket || packets[0] || null;

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Architecture Summary Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
              受保護硬體佇列架構 (Sheltered Hardware Ring Buffer / golf-sheltered)
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">記憶體位址:</span>
            <span className="text-cyan-300 font-bold">0x2000_1F00 - 0x2000_20E0 (TCM SRAM)</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">MPU 防護:</span>
            <span className="text-emerald-400 font-bold">REGION-3 LOCKED</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">控制核心節點</span>
            <span className="text-sm font-bold text-white">JUNCTION 0 (Core-0)</span>
            <span className="text-[10px] text-emerald-400 block mt-1">
              {telemetry.junction0Active ? '● 鎖定隔離運行中' : '✖ 脫機'}
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">封包密封狀態</span>
            <span className="text-sm font-bold text-cyan-400">CRC-32 SEALED</span>
            <span className="text-[10px] text-slate-400 block mt-1">
              硬體加速多項式校驗
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">優先級分流 (Priority)</span>
            <span className="text-sm font-bold text-amber-400">
              {burstActive ? 'LEVEL 0 (CRITICAL BURST)' : 'LEVEL 3 (NOMINAL)'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">
              sorting_presium_fork
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">姿態信任度 (Trust Metric)</span>
            <span className="text-sm font-bold text-emerald-400 tabular-nums">
              {(telemetry.junction0Stability).toFixed(1)} %
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">
              sponsored_ui-trust()
            </span>
          </div>
        </div>
      </div>

      {/* Main Queue Slots & Forensic Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Ring Buffer 16 Slots (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
                環狀佇列槽位 (Circular Ring Slots · 16 Frames)
              </span>
            </div>
            <span className="text-[10px] text-slate-400">點擊查看封包內部暫存器</span>
          </div>

          {/* Slots Table */}
          <div className="mt-3 overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                  <th className="py-2 px-2.5">槽位</th>
                  <th className="py-2 px-2.5">封包ID</th>
                  <th className="py-2 px-2.5">SRAM 位址</th>
                  <th className="py-2 px-2.5">姿態四元數 [qw, qx, qy, qz]</th>
                  <th className="py-2 px-2.5">密封校驗</th>
                  <th className="py-2 px-2.5">Junction 0</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {packets.map((pkt, idx) => {
                  const isSelected = inspected?.id === pkt.id;
                  return (
                    <tr
                      key={pkt.id}
                      onClick={() => setSelectedPacket(pkt)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-cyan-950/40 text-cyan-200'
                          : 'hover:bg-slate-800/40 text-slate-300'
                      }`}
                    >
                      <td className="py-2 px-2.5 font-bold text-slate-400">
                        #{idx.toString().padStart(2, '0')}
                      </td>
                      <td className="py-2 px-2.5 font-semibold text-white tabular-nums">
                        {pkt.id}
                      </td>
                      <td className="py-2 px-2.5 text-slate-400 tabular-nums">
                        {pkt.sramAddress}
                      </td>
                      <td className="py-2 px-2.5 text-cyan-400 text-[11px] tabular-nums">
                        [{pkt.quaternion[0].toFixed(2)}, {pkt.quaternion[1].toFixed(2)}, {pkt.quaternion[2].toFixed(2)}]
                      </td>
                      <td className="py-2 px-2.5">
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{pkt.crc32}</span>
                        </span>
                      </td>
                      <td className="py-2 px-2.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          pkt.junction0Routed
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {pkt.junction0Routed ? 'ACCEPTED' : 'DROPPED'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Packet Forensic Details (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
                  封包二進位解碼 (Packet Forensic Decoder)
                </span>
              </div>
              <span className="text-[10px] text-cyan-400 font-bold">
                ID #{inspected ? inspected.id : '---'}
              </span>
            </div>

            {inspected ? (
              <div className="mt-3 space-y-3">
                {/* Header Information */}
                <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">微秒時間戳 (Timestamp):</span>
                    <span className="text-white font-bold tabular-nums">
                      {inspected.timestampUs} µs
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">硬體 TCM 映射:</span>
                    <span className="text-cyan-400 tabular-nums">{inspected.sramAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">密封雜湊 (CRC-32):</span>
                    <span className="text-emerald-400 font-bold tabular-nums">0x{inspected.crc32}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">信賴權重 (Trust):</span>
                    <span className="text-cyan-300 tabular-nums">
                      {(inspected.validityScore * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Quaternion Coordinates */}
                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-2 uppercase">
                    姿態四元數姿態暫存器 (IEEE-754 Float32)
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-900 p-1.5 rounded flex justify-between">
                      <span className="text-slate-400">Q_w:</span>
                      <span className="text-cyan-300 font-bold tabular-nums">{inspected.quaternion[0].toFixed(5)}</span>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded flex justify-between">
                      <span className="text-slate-400">Q_x:</span>
                      <span className="text-cyan-300 font-bold tabular-nums">{inspected.quaternion[1].toFixed(5)}</span>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded flex justify-between">
                      <span className="text-slate-400">Q_y:</span>
                      <span className="text-cyan-300 font-bold tabular-nums">{inspected.quaternion[2].toFixed(5)}</span>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded flex justify-between">
                      <span className="text-slate-400">Q_z:</span>
                      <span className="text-cyan-300 font-bold tabular-nums">{inspected.quaternion[3].toFixed(5)}</span>
                    </div>
                  </div>
                </div>

                {/* Kinematics Vector */}
                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-2 uppercase">
                    角速度與加速度三軸物理量
                  </span>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">角速度 [ωx, ωy, ωz]:</span>
                      <span className="text-white tabular-nums">
                        {inspected.angularRates[0].toFixed(2)}, {inspected.angularRates[1].toFixed(2)}, {inspected.angularRates[2].toFixed(2)} °/s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">線性加速度 [ax, ay, az]:</span>
                      <span className="text-slate-300 tabular-nums">
                        {inspected.accelerations[0].toFixed(2)}, {inspected.accelerations[1].toFixed(2)}, {inspected.accelerations[2].toFixed(2)} m/s²
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* User's Original Pseudo-Code Mapping Callout */}
          <div className="mt-4 p-3 bg-slate-950 rounded border border-slate-800 text-[11px] leading-relaxed text-slate-400">
            <span className="text-cyan-400 font-semibold block mb-1">
              原始韌體偽代碼對應:
            </span>
            <code className="text-amber-300 block text-[10px] bg-slate-900 p-1.5 rounded border border-slate-800/80 mb-1 overflow-x-auto">
              ui-setting_core[0].queue_established.accent_s.truct[i-port.golf-sheltered().j-junction[0]]
            </code>
            此指令將關鍵姿態封包直通鎖入 <code className="text-cyan-300">golf-sheltered</code> 專屬硬體 DMA 緩衝區，並由 <code className="text-cyan-300">Junction 0</code> 控制核心獨占存取，完全阻絕中斷風暴與外部雜訊篡改。
          </div>
        </div>
      </div>
    </div>
  );
};

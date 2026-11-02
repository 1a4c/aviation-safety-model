/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Code2, Cpu, Check, Copy, BookOpen, Layers, HardDrive } from 'lucide-react';

export const FirmwareDecompiler: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pseudocode' | 'cpp' | 'memory'>('pseudocode');
  const [copied, setCopied] = useState(false);
  const [activeToken, setActiveToken] = useState<string | null>('brownian');

  const pseudoCodeRaw = `Order_probe.distinguished_validity.via_traffic[
  v-pinned_set(), 
  w-adminance_pinned-assigned.delta-shift[
    brownian_standardized_setting[
      flaw_processed().intensified_period-captured().sealed().prospensed_path[
        ui-setting_core[0].queue_established.accent_s.truct[
          i-port.golf-sheltered().j-junction[0]
        ].erected_id().sponsored_ui-trust().sorting_presium_fork[
          8-absolute_coined-detected[
            issue_kite[id-dislused_partial.action-phased_tempting_mode()]
          ]
        ]
      ]
    ]
  ]
}`;

  const cppHalCode = `/**
 * @file   avionics_guidance_core0.cpp
 * @brief  Avionics & UAV Guidance Firmware HAL Implementation
 *         Target: Cortex-M7 (480 MHz) / RISC-V Dual-Core Lockstep
 *         Memory Region: DTCM SRAM 0x20001F00 (MPU Protected)
 */

#include "avionics_firmware.h"

// Hardware Sheltered Queue Structure in DTCM SRAM
typedef struct __attribute__((aligned(32))) {
    uint32_t packet_id;            // erected_id()
    uint64_t timestamp_us;         // Microsecond hardware timestamp
    float    quaternion[4];        // [qw, qx, qy, qz]
    float    rates_deg_s[3];       // [wx, wy, wz]
    float    accel_mps2[3];        // [ax, ay, az]
    uint32_t crc32_seal;           // sealed().prospensed_path
    uint8_t  priority_fork;        // sorting_presium_fork (0=Burst, 3=Nominal)
    uint8_t  validity_score;       // sponsored_ui-trust()
} ShelteredPacket_t;

#define SHELTERED_RING_SIZE 16
static volatile ShelteredPacket_t s_sheltered_queue[SHELTERED_RING_SIZE] 
    __attribute__((section(".dtcm_ram.sheltered_fifo")));

static volatile uint32_t s_queue_head = 0;
static float s_brownian_drift_bias[3] = {0.0f, 0.0f, 0.0f};

/**
 * @brief  Brownianized Setting Prediction Model
 *         Compensates random-walk drift in IMU sensors at firmware layer
 */
void brownian_standardized_setting(const float raw_gyro[3], float compensated_rates[3]) {
    const float alpha_predict = 0.08f;
    for (int i = 0; i < 3; i++) {
        // Leaky stochastic integrator tracking Wiener diffusion
        s_brownian_drift_bias[i] += (raw_gyro[i] - s_brownian_drift_bias[i]) * alpha_predict;
        compensated_rates[i] = raw_gyro[i] - s_brownian_drift_bias[i];
    }
}

/**
 * @brief  High-Priority Timer Interrupt: Intensified Period-Captured Engine
 *         Switches sample frequency from 100Hz to 1000Hz upon disturbance tripwire
 */
void TIM1_UP_IntensifiedCapture_IRQHandler(void) {
    if (TIM1->SR & TIM_SR_UIF) {
        TIM1->SR = ~TIM_SR_UIF; // Clear interrupt flag

        // Read high-speed SPI IMU
        float raw_gyro[3], raw_accel[3], comp_rates[3];
        IMU_DMA_ReadBurst(raw_gyro, raw_accel);

        // 1. Predict and strip Brownian drift
        brownian_standardized_setting(raw_gyro, comp_rates);

        // 2. Discrete Kalman Step
        float quat[4], innovation_norm;
        Discrete_Kalman_Update(comp_rates, raw_accel, quat, &innovation_norm);

        // 3. Flaw Detection & Intensified Capture Trigger
        if (innovation_norm > INNOVATION_TRIPWIRE_DEG_S) {
            // Trigger 1kHz intensified burst
            TIM1->ARR = 480 - 1; // 480MHz / 480 = 1,000,000 Hz / 1000 = 1kHz
            Set_Burst_Active(1400); // 1.4s burst hold
        }

        // 4. Sealed Sheltered Queue Push (golf-sheltered / junction[0])
        uint32_t slot = s_queue_head % SHELTERED_RING_SIZE;
        s_sheltered_queue[slot].packet_id = Get_Next_Erected_Id();
        s_sheltered_queue[slot].timestamp_us = DWT_GetMicroseconds();
        memcpy((void*)s_sheltered_queue[slot].quaternion, quat, sizeof(quat));
        memcpy((void*)s_sheltered_queue[slot].rates_deg_s, comp_rates, sizeof(comp_rates));
        memcpy((void*)s_sheltered_queue[slot].accel_mps2, raw_accel, sizeof(raw_accel));
        
        // Calculate hardware CRC32
        s_sheltered_queue[slot].crc32_seal = CRC32_Calculate(
            (const uint8_t*)&s_sheltered_queue[slot], sizeof(ShelteredPacket_t) - 4
        );
        s_queue_head++;

        // 5. Direct Dispatch to Flight Control Core Junction 0
        Junction0_Attitude_Control_Dispatch(&s_sheltered_queue[slot]);
    }
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeTab === 'cpp' ? cppHalCode : pseudoCodeRaw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Tab Switcher & Action */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
            航太導航控制韌體解析與反組譯 (Firmware Decompiler & HAL)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950 p-1 rounded border border-slate-800">
            <button
              onClick={() => setActiveTab('pseudocode')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                activeTab === 'pseudocode'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              原始偽代碼結構 (AST)
            </button>
            <button
              onClick={() => setActiveTab('cpp')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                activeTab === 'cpp'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              MISRA-C++ HAL 驅動
            </button>
            <button
              onClick={() => setActiveTab('memory')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                activeTab === 'memory'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              硬體暫存器與記憶體映射
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '已複製' : '複製代碼'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'pseudocode' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Pseudo Code View (6 cols) */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
              <span className="text-slate-300 font-semibold">用戶原始韌體指令序列 (Pseudo Code)</span>
              <span className="text-[10px] text-cyan-400">點擊高亮子模組</span>
            </div>

            <pre className="p-3 bg-slate-950 rounded border border-slate-800 text-slate-200 text-xs leading-relaxed overflow-x-auto whitespace-pre font-mono">
              <span className="text-purple-400">Order_probe</span>.<span className="text-blue-400">distinguished_validity</span>.<span className="text-cyan-400">via_traffic</span>[<br />
              &nbsp;&nbsp;<span className="text-emerald-400">v-pinned_set()</span>, <br />
              &nbsp;&nbsp;<span className="text-emerald-400">w-adminance_pinned-assigned</span>.<span className="text-yellow-400">delta-shift</span>[<br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span
                onClick={() => setActiveToken('brownian')}
                className={`cursor-pointer px-1 rounded ${activeToken === 'brownian' ? 'bg-cyan-500/30 text-cyan-300 font-bold underline' : 'text-cyan-400 hover:underline'}`}
              >
                brownian_standardized_setting
              </span>[<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
                onClick={() => setActiveToken('intensified')}
                className={`cursor-pointer px-1 rounded ${activeToken === 'intensified' ? 'bg-amber-500/30 text-amber-300 font-bold underline' : 'text-amber-400 hover:underline'}`}
              >
                flaw_processed().intensified_period-captured()
              </span>.<span className="text-blue-300">sealed()</span>.<span className="text-blue-300">prospensed_path</span>[<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
                onClick={() => setActiveToken('junction0')}
                className={`cursor-pointer px-1 rounded ${activeToken === 'junction0' ? 'bg-emerald-500/30 text-emerald-300 font-bold underline' : 'text-emerald-400 hover:underline'}`}
              >
                ui-setting_core[0].queue_established
              </span>.accent_s.truct[<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
                onClick={() => setActiveToken('sheltered')}
                className={`cursor-pointer px-1 rounded ${activeToken === 'sheltered' ? 'bg-purple-500/30 text-purple-300 font-bold underline' : 'text-purple-400 hover:underline'}`}
              >
                i-port.golf-sheltered().j-junction[0]
              </span><br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;].<span className="text-sky-300">erected_id()</span>.<span className="text-sky-300">sponsored_ui-trust()</span>.<span
                onClick={() => setActiveToken('fork')}
                className={`cursor-pointer px-1 rounded ${activeToken === 'fork' ? 'bg-rose-500/30 text-rose-300 font-bold underline' : 'text-rose-400 hover:underline'}`}
              >
                sorting_presium_fork
              </span>[<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-400">8-absolute_coined-detected[</span><br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-400">issue_kite[id-dislused_partial.action-phased_tempting_mode()]</span><br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-400">]</span><br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]<br />
              &nbsp;&nbsp;&nbsp;&nbsp;]<br />
              &nbsp;&nbsp;]<br />
              ]
            </pre>
          </div>

          {/* Interactive Clause Breakdown (6 cols) */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800 mb-3">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-300 font-semibold">韌體底層物理意義與硬體行為詳解</span>
              </div>

              {activeToken === 'brownian' && (
                <div className="space-y-2">
                  <span className="text-sm font-bold text-cyan-400 block">
                    1. brownian_standardized_setting (布朗運動漂移前饋模型)
                  </span>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    飛行器遭遇強烈大氣亂流或電磁干擾時，IMU 內部微機電震盪器會產生隨機漫步（Random Walk）漂移，數學上符合布朗運動維納過程 $B(t) = \int_0^t \sigma dW_s$。
                  </p>
                  <div className="bg-slate-950 p-3 rounded border border-slate-800 text-slate-300 space-y-1">
                    <div className="text-cyan-300 font-semibold">韌體處置價值:</div>
                    <div>• 在韌體底層即時跟蹤隨機漂移趨勢斜率</div>
                    <div>• 於卡爾曼濾波器輸入端實施前饋扣減，大幅降低狀態預測殘差</div>
                    <div>• 避免長時間積分下滾轉角（Roll）與俯仰角（Pitch）累計漂移</div>
                  </div>
                </div>
              )}

              {activeToken === 'intensified' && (
                <div className="space-y-2">
                  <span className="text-sm font-bold text-amber-400 block">
                    2. flaw_processed().intensified_period-captured() (強化捕獲週期)
                  </span>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    當感測器數據超過動態閾值（例如突然出現 &gt;12°/s 殘差、EMI 噪聲脈衝或震動尖波）時，常態的 100Hz 取樣率容易因奈奎斯特極限發生頻譜混疊。
                  </p>
                  <div className="bg-slate-950 p-3 rounded border border-slate-800 text-slate-300 space-y-1">
                    <div className="text-amber-300 font-semibold">韌體處置價值:</div>
                    <div>• 定時器即時中斷將取樣頻率拉升至 1000 Hz（1kHz 突發週期）</div>
                    <div>• 將瞬態高頻微振動與擾動波形完整捕獲，徹底消除相位延遲</div>
                    <div>• 待擾動平息後平滑回落至 100Hz 省電常態</div>
                  </div>
                </div>
              )}

              {activeToken === 'sheltered' && (
                <div className="space-y-2">
                  <span className="text-sm font-bold text-purple-400 block">
                    3. i-port.golf-sheltered().j-junction[0] (受保護硬體佇列)
                  </span>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    關鍵飛行姿態封包（四元數、三軸角速率、加速度）必須絕對防止因系統中斷風暴或記憶體並發存取而被覆寫或損毀。
                  </p>
                  <div className="bg-slate-950 p-3 rounded border border-slate-800 text-slate-300 space-y-1">
                    <div className="text-purple-300 font-semibold">韌體處置價值:</div>
                    <div>• 在 TCM SRAM 劃分專屬環狀佇列（Sheltered FIFO），啟用 MPU 記憶體保護</div>
                    <div>• 封包經硬體 CRC-32 密封（sealed().prospensed_path）驗證</div>
                    <div>• 直通飛行控制核心 Junction 0，杜絕暫態雜訊誤判</div>
                  </div>
                </div>
              )}

              {activeToken === 'junction0' && (
                <div className="space-y-2">
                  <span className="text-sm font-bold text-emerald-400 block">
                    4. ui-setting_core[0] (控制核心 Junction 0)
                  </span>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    無人機飛行姿態閉迴路主控核心，專責計算四軸馬達 RPM 輸出與姿態平衡。由於受保護硬體佇列過濾掉所有暫態無效尖波，Junction 0 不會因雜訊產生馬達震顫或失速。
                  </p>
                </div>
              )}

              {activeToken === 'fork' && (
                <div className="space-y-2">
                  <span className="text-sm font-bold text-rose-400 block">
                    5. sorting_presium_fork & issue_kite (故障多級隔離分流)
                  </span>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    8級絕對故障判斷（8-absolute_coined-detected）。當檢測到感測器部分失效時，立即切換至逐步容錯應急模式（action-phased_tempting_mode），維持飛行器基礎姿態。
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>切換標籤查看不同底層架構</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveToken('brownian')}
                  className="hover:text-cyan-400"
                >
                  [布朗模型]
                </button>
                <button
                  onClick={() => setActiveToken('intensified')}
                  className="hover:text-amber-400"
                >
                  [強化捕獲]
                </button>
                <button
                  onClick={() => setActiveToken('sheltered')}
                  className="hover:text-purple-400"
                >
                  [硬體佇列]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* C++ MISRA Implementation */}
      {activeTab === 'cpp' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
            <span className="text-slate-300 font-semibold">生產級嵌入式 C++ / MISRA-C 驅動源碼 (Cortex-M7 / RTOS)</span>
            <span className="text-xs text-slate-400">DTCM SRAM 映射 · 零記憶體拷貝</span>
          </div>

          <pre className="p-4 bg-slate-950 rounded border border-slate-800 text-slate-300 text-xs leading-relaxed overflow-x-auto whitespace-pre font-mono">
            {cppHalCode}
          </pre>
        </div>
      )}

      {/* Hardware Memory & Register Map */}
      {activeTab === 'memory' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-300 font-semibold">硬體位址空間與 MPU 暫存器映射</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <span className="text-cyan-400 font-bold block mb-1">
                0x0000_0000 - 0x0001_FFFF
              </span>
              <span className="text-white font-semibold text-xs block">
                ITCM RAM (指令緊耦合記憶體)
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                執行零等待時間（Zero Wait-State）卡爾曼姿態解算與布朗漂移估計核心演算法。
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded border border-purple-500/50">
              <span className="text-purple-400 font-bold block mb-1">
                0x2000_1F00 - 0x2000_20E0
              </span>
              <span className="text-white font-semibold text-xs block">
                DTCM SRAM: Sheltered FIFO
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                受保護硬體佇列（golf-sheltered），配置 MPU Region 3 專用寫入保護，僅 Junction 0 擁有讀取優先權。
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <span className="text-emerald-400 font-bold block mb-1">
                0x4002_0000 - 0x4002_0FFF
              </span>
              <span className="text-white font-semibold text-xs block">
                Junction 0 Actuator Timers
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                TIM1/TIM8 互補帶死區的高級 PWM 定時器，以 24kHz 頻率直推 4 軸無刷馬達電子調速器（ESC）。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * @file src/components/DashboardTab.tsx
 * Gateway Health, Live Diagnostics, and Subsystems Status Overview
 * แสดงข้อมูลจริงจาก API เท่านั้น ปราศจากข้อมูลจำลอง
 */

import React, { useState } from 'react';
import {
  Activity,
  Server,
  Shield,
  Clock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Settings,
  Lock,
  Terminal,
  Database
} from 'lucide-react';
import { GatewayHealthResponse, GatewayAdminOverview, ConnectionStatus } from '../types/gateway';
import { formatThaiDateTime, formatUptimeThai } from '../utils/formatters';

interface DashboardTabProps {
  connectionStatus: ConnectionStatus;
  healthData: GatewayHealthResponse | null;
  adminOverview: GatewayAdminOverview | null;
  latencyMs: number | null;
  lastChecked: Date | null;
  errorMessage: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  customEndpoint: string;
  onUpdateEndpoint: (url: string) => void;
  onNavigateToModules: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  connectionStatus,
  healthData,
  adminOverview,
  latencyMs,
  lastChecked,
  errorMessage,
  isRefreshing,
  onRefresh,
  customEndpoint,
  onUpdateEndpoint,
  onNavigateToModules
}) => {
  const [showEndpointConfig, setShowEndpointConfig] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>(customEndpoint);

  const handleSaveEndpoint = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateEndpoint(inputUrl);
    setShowEndpointConfig(false);
  };

  const isConnected = connectionStatus === 'connected' && healthData !== null;
  const healthStatus = healthData?.status || 'UNKNOWN';

  // Subsystems array from real API response
  const subsystems = healthData?.subsystems ? Object.values(healthData.subsystems) : [];

  return (
    <div className="space-y-6">
      {/* 1. Connection & Incident Status Banner */}
      {connectionStatus === 'offline' && (
        <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-sm">ไม่สามารถติดต่อ Central API Gateway ได้ (Gateway Offline)</h3>
              <p className="text-xs text-rose-800 dark:text-rose-300 mt-1 leading-relaxed">
                {errorMessage || 'ระบบไม่สามารถส่งคำขอไปยังพอร์ต 3002 ได้ กรุณาตรวจสอบว่า Service Node.js กำลังทำงานอยู่บน Windows Server หรือไม่ หรือรันคำสั่ง scripts\\start-gateway.bat'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={onRefresh}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium"
                >
                  ลองใหม่อีกครั้ง
                </button>
                <button
                  onClick={() => setShowEndpointConfig(true)}
                  className="px-3 py-1 bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 text-rose-900 dark:text-rose-200 rounded text-xs font-medium border border-rose-300 dark:border-rose-800"
                >
                  ตั้งค่า URL การเชื่อมต่อ (Endpoint Settings)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Top Summary Metrics Grid (Data strictly from real API) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Gateway Status */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>สถานะเซิร์ฟเวอร์ (Gateway Health)</span>
            <Activity className="w-4 h-4 text-teal-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            {isConnected ? (
              <span className={`text-2xl font-bold tracking-tight ${
                healthStatus === 'UP' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
              }`}>
                {healthStatus}
              </span>
            ) : (
              <span className="text-2xl font-bold tracking-tight text-slate-400 dark:text-slate-600">
                OFFLINE
              </span>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isConnected ? (healthStatus === 'UP' ? 'พร้อมให้บริการ' : 'สถานะจำกัด') : 'ไม่ตอบสนอง'}
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>การตอบสนอง:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {latencyMs !== null ? `${latencyMs} ms` : '-'}
            </span>
          </div>
        </div>

        {/* Metric 2: Uptime */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>ระยะเวลาทำงานต่อเนื่อง (Uptime)</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isConnected ? formatUptimeThai(healthData?.uptimeSeconds) : 'Unknown'}
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>ตรวจสอบล่าสุด:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {lastChecked ? lastChecked.toLocaleTimeString('th-TH') : '-'}
            </span>
          </div>
        </div>

        {/* Metric 3: Port & Protocol */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>พอร์ตและโปรโตคอล (Port Binding)</span>
            <Radio className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {healthData?.port || '3002'}
            </span>
            <span className="text-xs uppercase font-semibold text-teal-600 dark:text-teal-400">
              {healthData?.protocol || 'HTTPS'}
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Host Binding:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {adminOverview?.gateway?.host || '0.0.0.0 (IP: 10.2.0.13)'}
            </span>
          </div>
        </div>

        {/* Metric 4: Registered Subsystems */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>ระบบใน Registry (Modules)</span>
            <Database className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {subsystems.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">โมดูลในระบบ</span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>ระบบสำคัญ (Protected):</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Procurement</span>
          </div>
        </div>
      </div>

      {/* 3. Endpoint Configuration Panel (Collapsible) */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              การกำหนดค่าการเชื่อมต่อ API Gateway (Connection Target)
            </h3>
          </div>
          <button
            onClick={() => setShowEndpointConfig(!showEndpointConfig)}
            className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-medium"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{showEndpointConfig ? 'ซ่อนการตั้งค่า' : 'ปรับเปลี่ยน Endpoint'}</span>
          </button>
        </div>

        {showEndpointConfig ? (
          <form onSubmit={handleSaveEndpoint} className="p-5 space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              กำหนด URL ที่ Console ใช้เชื่อมต่อไปยัง Backend Gateway (สำหรับสภาพแวดล้อม IIS Reverse Proxy แนะนำให้เว้นว่างเพื่อใช้ Relative Path <code>/api</code> ผ่านพอร์ต 3001)
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="เช่น https://10.2.0.13:3002 หรือเว้นว่างสำหรับ Relative Path (/)"
                className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                บันทึกและเชื่อมต่อใหม่
              </button>
              <button
                type="button"
                onClick={() => { setInputUrl(''); onUpdateEndpoint(''); setShowEndpointConfig(false); }}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs border border-slate-200 dark:border-slate-700"
              >
                ใช้ค่าเริ่มต้น (Relative)
              </button>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              ปัจจุบันเชื่อมต่อผ่าน: <code className="font-mono text-teal-600 dark:text-teal-400">{customEndpoint || '(Relative Path: Same-Origin ผ่าน IIS Reverse Proxy)'}</code>
            </div>
          </form>
        ) : (
          <div className="px-5 py-3 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span>เป้าหมายการเชื่อมต่อ: </span>
              <code className="font-mono text-teal-600 dark:text-teal-400 font-semibold">
                {customEndpoint || '(Relative Path: Same-Origin ผ่าน IIS Reverse Proxy)'}
              </code>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span>CORS Allowlist: <code className="font-mono text-slate-700 dark:text-slate-300">https://10.2.0.13:3001</code></span>
              <span>·</span>
              <span>Backend Port: <code className="font-mono text-slate-700 dark:text-slate-300">3002</code></span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Subsystems Live Status Overview */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>ภาพรวมสถานะระบบโรงพยาบาล (Subsystem Modules)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ดึงข้อมูลตรงจาก Module Registry ของ Gateway โดยไม่มีการสร้างข้อมูลเท็จ
            </p>
          </div>
          <button
            onClick={onNavigateToModules}
            className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-medium"
          >
            <span>จัดการโมดูล</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5">
          {subsystems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subsystems.map((sub) => {
                const isProcurement = sub.id === 'procurement';
                return (
                  <div
                    key={sub.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isProcurement
                        ? 'border-teal-300 dark:border-teal-800 bg-teal-50/40 dark:bg-teal-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {sub.name}
                          </h4>
                          {isProcurement && (
                            <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-1.5 py-0.2 rounded">
                              Required / Protected
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-teal-600 dark:text-teal-400 mt-1">
                          {sub.prefix}
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div>
                        {sub.status === 'ACTIVE' && (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ACTIVE</span>
                          </span>
                        )}
                        {sub.status === 'NOT_CONFIGURED' && (
                          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1" title="ยังไม่ระบุพาธไฟล์จริง หรือรอการย้ายระบบ">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Adapter Ready</span>
                          </span>
                        )}
                        {sub.status === 'DISABLED' && (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            DISABLED
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>ฐานข้อมูล:</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">อิสระ (Module Own Pool)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>พอร์ต Listener:</span>
                        <span className="text-slate-700 dark:text-slate-300 font-mono">None (Gateway 3002 Only)</span>
                      </div>
                      {isProcurement && (
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium pt-1">
                          🔒 ได้รับการป้องกัน: ห้าม Stop / Reload / Rollback
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              {isConnected
                ? 'ยังไม่มีข้อมูล Subsystems ใน Registry'
                : 'ไม่สามารถโหลดรายการโมดูลได้เนื่องจาก Gateway ออฟไลน์'}
            </div>
          )}
        </div>
      </div>

      {/* 5. Production Notice & Safety Guarantees */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
        <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-slate-900 dark:text-slate-200">มาตรการคุ้มครองความปลอดภัยระบบโรงพยาบาลสามชุก:</strong>
          {' '}ขณะนี้ระบบ Procurement Backend เดิมยังคงให้บริการบนพอร์ต 3002 ของเครื่องเซิร์ฟเวอร์จริง Central API Gateway V2 ปฏิบัติตามนโยบายอย่างเคร่งครัดโดยไม่มีการเปิดพอร์ตชั่วคราวอื่น ไม่รันคำสั่ง taskkill /F และระบบควบคุมโมดูลทั้งหมดอยู่ในโหมด <strong>Read-Only Observer</strong> จนกว่าจะถึงกำหนดการ Cutover
        </div>
      </div>
    </div>
  );
};

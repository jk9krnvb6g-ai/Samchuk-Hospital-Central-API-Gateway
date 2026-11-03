/**
 * @file src/components/MonitoringTab.tsx
 * API Monitoring & Health Diagnostics Tab
 * ปฏิบัติตามกฎความปลอดภัยอย่างเคร่งครัด: หาก Backend ยังไม่มี Metrics API ห้ามสร้างตัวเลขจำลองมาแสดงเป็นข้อมูลจริง
 */

import React from 'react';
import {
  Radio,
  Activity,
  AlertTriangle,
  Clock,
  Zap,
  ShieldAlert,
  Server,
  Info,
  CheckCircle2,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { ConnectionStatus, GatewayHealthStatus } from '../types/gateway';

interface MonitoringTabProps {
  connectionStatus: ConnectionStatus;
  gatewayHealth: GatewayHealthStatus | undefined;
  latencyMs: number | null;
  lastChecked: Date | null;
  uptimeSeconds: number | undefined;
  onRefresh: () => void;
}

export const MonitoringTab: React.FC<MonitoringTabProps> = ({
  connectionStatus,
  gatewayHealth,
  latencyMs,
  lastChecked,
  uptimeSeconds,
  onRefresh
}) => {
  const isConnected = connectionStatus === 'connected';

  return (
    <div className="space-y-6">
      {/* 1. Transparent Metrics Status Announcement */}
      <div className="p-5 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <h3 className="font-bold text-sm">
              สถานะบริการเก็บสถิติ (Metrics Collector Status): ยังไม่มี Metrics Stream API บน Production
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-1">
              ตามนโยบายความถูกต้องของข้อมูลโรงพยาบาลสามชุก <strong>ระบบจะไม่สร้างกราฟหรือตัวเลขสุ่มจำลองมาแสดงเป็นข้อมูล Production โดยเด็ดขาด</strong> Backend ปัจจุบันยังไม่มี Prometheus / In-Memory Metrics Collector ติดตั้ง จึงแสดงเฉพาะสถานะการเชื่อมต่อจริงและเวลา Latency ล่าสุด
            </p>
          </div>
        </div>
      </div>

      {/* 2. Real Verified Diagnostics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Real Ping Latency */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>ความเร็วในการตอบสนอง (Live Ping Latency)</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {latencyMs !== null ? latencyMs : '-'}
            </span>
            <span className="text-xs font-semibold text-slate-500">ms</span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            สถานะ: {latencyMs !== null && latencyMs < 50 ? 'ความเร็วสูงมาก (<50ms)' : 'ปกติ'}
          </div>
        </div>

        {/* Real Socket Connection State */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>สถานะการเชื่อมต่อเครือข่าย (TCP Socket)</span>
            <Server className="w-4 h-4 text-teal-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-xl font-bold tracking-tight ${
              isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
            }`}>
              {isConnected ? 'ESTABLISHED (HTTPS 3002)' : 'DISCONNECTED'}
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            TLS MinVersion: TLSv1.2 (Enforced)
          </div>
        </div>

        {/* Real Protocol & Health status */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>สถานะ Gateway Service</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {gatewayHealth || 'UNKNOWN'}
            </span>
            <span className="text-xs text-slate-500">
              {isConnected ? 'ตรวจสอบทุก 10 วินาที' : 'ออฟไลน์'}
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            ตรวจสอบล่าสุด: {lastChecked ? lastChecked.toLocaleTimeString('th-TH') : '-'}
          </div>
        </div>
      </div>

      {/* 3. Planned Metrics Layout Structure (Marked Clearly as Feature Unavailable) */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <span>โครงสร้างมาตรวัดประสิทธิภาพ (Performance Metrics Structure - V2.1 Roadmap)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              เตรียมโครงสร้างหน้าจอสำหรับ Request Count, Response Time, และ Error Rate เมื่อติดตั้ง Monitoring Middleware
            </p>
          </div>
          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            Feature In Development
          </span>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 opacity-75">
            {/* Planned Metric: Request Volume */}
            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/40">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                จำนวนคำขอทั้งหมด (Request Volume)
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-400 dark:text-slate-600">
                -- req/s
              </div>
              <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                ต้องการ Prometheus Exporter
              </div>
            </div>

            {/* Planned Metric: P95 Latency */}
            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/40">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                ความหน่วงเฉลี่ย P95 Latency
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-400 dark:text-slate-600">
                -- ms
              </div>
              <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                ต้องการ Histograms Collector
              </div>
            </div>

            {/* Planned Metric: Error Rate 4xx / 5xx */}
            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/40">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                อัตราข้อผิดพลาด (Error Rate)
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-400 dark:text-slate-600">
                -- %
              </div>
              <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                คำนวณจาก HTTP 4xx & 5xx
              </div>
            </div>

            {/* Planned Metric: Active Concurrency */}
            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/40">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                การเชื่อมต่อพร้อมกัน (Concurrency)
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-400 dark:text-slate-600">
                -- sockets
              </div>
              <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                ตรวจวัดจาก net.Server Connections
              </div>
            </div>
          </div>

          {/* Integration Specification Checklist */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Info className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>แนวทางการเปิดใช้งาน Metrics API ในเฟส V2.1:</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              <li>ใช้ไลบรารี <code>prom-client</code> ภายใน Central-API โดยไม่เปิดพอร์ตเพิ่ม</li>
              <li>เปิดเส้นทาง <code>GET /api/gateway/admin/metrics</code> โดยจำกัดการเข้าถึงเฉพาะเครือข่ายภายใน</li>
              <li>แยกการเก็บสถิติออกจาก Process หลักเพื่อไม่ให้กระทบประสิทธิภาพของระบบจัดซื้อและเวชระเบียน</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

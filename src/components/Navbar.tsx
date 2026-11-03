/**
 * @file src/components/Navbar.tsx
 * Top Navigation Bar with Samchuk Hospital Branding, Live Connection Indicator, and Theme Toggle
 */

import React from 'react';
import {
  Shield,
  Activity,
  RefreshCw,
  Sun,
  Moon,
  Server,
  Layers,
  Radio,
  FileText,
  Lock,
  Download,
  Terminal
} from 'lucide-react';
import { ConnectionStatus, GatewayHealthStatus } from '../types/gateway';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  connectionStatus: ConnectionStatus;
  gatewayHealth: GatewayHealthStatus | undefined;
  latencyMs: number | null;
  lastChecked: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onDownloadZip: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  connectionStatus,
  gatewayHealth,
  latencyMs,
  isRefreshing,
  onRefresh,
  theme,
  onToggleTheme,
  onDownloadZip
}) => {
  const getStatusColor = () => {
    if (connectionStatus === 'connecting') return 'bg-amber-400';
    if (connectionStatus === 'connected') {
      return gatewayHealth === 'UP' ? 'bg-emerald-500' : 'bg-amber-500';
    }
    return 'bg-rose-500';
  };

  const getStatusText = () => {
    if (connectionStatus === 'connecting') return 'กำลังเชื่อมต่อ...';
    if (connectionStatus === 'connected') {
      return gatewayHealth === 'UP' ? 'ออนไลน์ปกติ (UP)' : 'สถานะเสื่อมถอย (DEGRADED)';
    }
    if (connectionStatus === 'offline') return 'ออฟไลน์ (Offline)';
    return 'ข้อผิดพลาดการเชื่อมต่อ';
  };

  const navItems = [
    { id: 'dashboard', label: 'แดชบอร์ดหลัก', icon: Activity },
    { id: 'modules', label: 'จัดการโมดูลระบบ', icon: Layers },
    { id: 'monitoring', label: 'เฝ้าระวัง API', icon: Radio },
    { id: 'logs', label: 'บันทึกเหตุการณ์ (Logs)', icon: FileText },
    { id: 'security', label: 'ความปลอดภัยและสิทธิ์', icon: Lock },
    { id: 'deployment', label: 'พิมพ์เขียวและคู่มือ IIS', icon: Terminal }
  ];

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 transition-colors">
      {/* Top Hospital Identity Stripe */}
      <div className="bg-slate-900 text-slate-200 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-teal-400">โรงพยาบาลสามชุก จ.สุพรรณบุรี</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300">ระบบศูนย์กลาง Central API Gateway V2</span>
          <span className="text-slate-500">·</span>
          <span className="text-amber-300 font-mono text-[11px]">โหมดสังเกตการณ์ (Read-only Observer)</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          <span>IIS Frontend: <span className="font-mono text-slate-200">10.2.0.13:3001</span></span>
          <span>·</span>
          <span>Gateway Backend: <span className="font-mono text-teal-300 font-semibold">10.2.0.13:3002 (HTTPS Only)</span></span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-600 dark:bg-teal-500/20 text-white dark:text-teal-400 flex items-center justify-center shadow-md">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Gateway Management Console
              </h1>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                v2.0 Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              คอนโซลบริหารจัดการระบบสำหรับฝ่ายเทคโนโลยีสารสนเทศ
            </p>
          </div>
        </div>

        {/* Live Status Cluster & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Real Connection Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
            <span className={`h-2.5 w-2.5 rounded-full ${getStatusColor()} animate-pulse`}></span>
            <span className="font-medium text-slate-700 dark:text-slate-200">{getStatusText()}</span>
            {latencyMs !== null && (
              <>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{latencyMs} ms</span>
              </>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="รีเฟรชข้อมูลสถานะจาก Gateway จริง"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-500' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'กำลังโหลด...' : 'รีเฟรช'}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง (Light Mode)' : 'เปลี่ยนเป็นโหมดมืด (Dark Mode)'}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Download Package Button */}
          <button
            onClick={onDownloadZip}
            title="ดาวน์โหลดไฟล์แพ็กเกจโครงการทั้งหมดสำหรับ Windows Server"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ZIP โครงการ</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Zero-pill Segmented Control Style) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex items-center gap-1 overflow-x-auto py-1 text-xs border-t border-slate-200 dark:border-slate-800/80 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-teal-600 dark:border-teal-400 text-teal-700 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-950/20'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

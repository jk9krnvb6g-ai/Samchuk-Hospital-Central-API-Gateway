/**
 * @file src/App.tsx
 * Samchuk Hospital Central API Gateway V2 — Management Console
 * ระบบบริหารจัดการและตรวจสอบสถานะ Central API Gateway สำหรับเจ้าหน้าที่ IT โรงพยาบาลสามชุก
 */

import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardTab } from './components/DashboardTab';
import { ModuleManagerTab } from './components/ModuleManagerTab';
import { MonitoringTab } from './components/MonitoringTab';
import { LogsAuditTab } from './components/LogsAuditTab';
import { SecurityTab } from './components/SecurityTab';
import { DeploymentTab } from './components/DeploymentTab';
import { useTheme } from './hooks/useTheme';
import { useGatewayHealth } from './hooks/useGatewayHealth';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const {
    connectionStatus,
    healthData,
    adminOverview,
    latencyMs,
    lastChecked,
    errorMessage,
    isRefreshing,
    customEndpoint,
    updateEndpointUrl,
    refresh
  } = useGatewayHealth();

  const handleDownloadZip = () => {
    const link = document.createElement('a');
    link.href = '/samchuk-central-api-gateway.zip';
    link.download = 'samchuk-central-api-gateway.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Modules Record for Module Manager
  const modulesRecord = healthData?.subsystems || {
    procurement: {
      id: 'procurement',
      name: 'Procurement (ระบบจัดซื้อจัดจ้าง)',
      prefix: '/api/Procurement',
      status: 'NOT_CONFIGURED',
      enabled: true,
      required: true,
      hasSourcePath: false
    },
    samAtt: {
      id: 'sam-att',
      name: 'Sam_Att (ระบบลงเวลาปฏิบัติงาน)',
      prefix: '/api/Sam_Att',
      status: 'NOT_CONFIGURED',
      enabled: true,
      required: false,
      hasSourcePath: false
    },
    cashCheque: {
      id: 'cash-cheque',
      name: 'Cash_Cheque (ระบบเงินสดและเช็ค)',
      prefix: '/api/Cash_Cheque',
      status: 'NOT_CONFIGURED',
      enabled: true,
      required: false,
      hasSourcePath: false
    },
    inventory: {
      id: 'inventory',
      name: 'Inventory (ระบบพัสดุและคลังยา)',
      prefix: '/api/Inventory',
      status: 'DISABLED',
      enabled: false,
      required: false,
      hasSourcePath: false
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* 1. Header & Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        connectionStatus={connectionStatus}
        gatewayHealth={healthData?.status}
        latencyMs={latencyMs}
        lastChecked={lastChecked}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
        theme={theme}
        onToggleTheme={toggleTheme}
        onDownloadZip={handleDownloadZip}
      />

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'dashboard' && (
          <DashboardTab
            connectionStatus={connectionStatus}
            healthData={healthData}
            adminOverview={adminOverview}
            latencyMs={latencyMs}
            lastChecked={lastChecked}
            errorMessage={errorMessage}
            isRefreshing={isRefreshing}
            onRefresh={refresh}
            customEndpoint={customEndpoint}
            onUpdateEndpoint={updateEndpointUrl}
            onNavigateToModules={() => setActiveTab('modules')}
          />
        )}

        {activeTab === 'modules' && (
          <ModuleManagerTab
            modules={modulesRecord}
            onRefresh={refresh}
          />
        )}

        {activeTab === 'monitoring' && (
          <MonitoringTab
            connectionStatus={connectionStatus}
            gatewayHealth={healthData?.status}
            latencyMs={latencyMs}
            lastChecked={lastChecked}
            uptimeSeconds={healthData?.uptimeSeconds}
            onRefresh={refresh}
          />
        )}

        {activeTab === 'logs' && <LogsAuditTab />}

        {activeTab === 'security' && <SecurityTab />}

        {activeTab === 'deployment' && (
          <DeploymentTab onDownloadZip={handleDownloadZip} />
        )}
      </main>

      {/* 3. Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-4 sm:px-6 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>โรงพยาบาลสามชุก (Samchuk Hospital)</strong> — Central API Gateway V2 Console
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Node.js + Express | HTTPS Port 3002 | IIS Port 3001
          </div>
        </div>
      </footer>
    </div>
  );
}

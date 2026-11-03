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
    refresh,
    // Admin Session & Registry
    isAuthenticated,
    adminUser,
    authenticatedModules,
    isLoadingModules,
    login,
    logout,
    refreshModules
  } = useGatewayHealth();

  const handleDownloadZip = () => {
    const link = document.createElement('a');
    link.href = '/samchuk-central-api-gateway.zip';
    link.download = 'samchuk-central-api-gateway.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        isAuthenticated={isAuthenticated}
        adminUser={adminUser}
        onLogout={logout}
        onOpenLogin={() => setActiveTab('modules')}
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
            authenticatedModules={authenticatedModules}
            isAuthenticated={isAuthenticated}
          />
        )}

        {activeTab === 'modules' && (
          <ModuleManagerTab
            modules={authenticatedModules}
            isAuthenticated={isAuthenticated}
            adminUser={adminUser}
            isLoadingModules={isLoadingModules}
            onLogin={login}
            onLogout={logout}
            onRefresh={refreshModules}
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

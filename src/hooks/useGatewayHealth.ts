/**
 * @file src/hooks/useGatewayHealth.ts
 * Real-time Gateway Health, Admin Session, and Diagnostics Hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GatewayHealthResponse,
  GatewayAdminOverview,
  ConnectionStatus,
  ModuleRecord,
  AdminUser
} from '../types/gateway';
import { gatewayApiClient } from '../services/gatewayApi';

export function useGatewayHealth() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [healthData, setHealthData] = useState<GatewayHealthResponse | null>(null);
  const [adminOverview, setAdminOverview] = useState<GatewayAdminOverview | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10000); // 10 วินาที
  const [customEndpoint, setCustomEndpoint] = useState<string>(gatewayApiClient.getBaseUrl());

  // Admin Session State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [authenticatedModules, setAuthenticatedModules] = useState<Record<string, ModuleRecord> | null>(null);
  const [isLoadingModules, setIsLoadingModules] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);

  // Check admin session
  const verifySession = useCallback(async () => {
    try {
      const session = await gatewayApiClient.checkSession();
      if (!isMountedRef.current) return;
      setIsAuthenticated(session.authenticated);
      setAdminUser(session.user || null);

      if (session.authenticated) {
        setIsLoadingModules(true);
        const moduleResult = await gatewayApiClient.fetchAuthenticatedModules();
        if (isMountedRef.current && moduleResult.success && moduleResult.data) {
          setAuthenticatedModules(moduleResult.data);
        }
        setIsLoadingModules(false);
      } else {
        setAuthenticatedModules(null);
      }
    } catch {
      if (isMountedRef.current) {
        setIsAuthenticated(false);
        setAdminUser(null);
        setAuthenticatedModules(null);
      }
    }
  }, []);

  const fetchLiveStatus = useCallback(async (isManual: boolean = false) => {
    if (isManual) {
      setIsRefreshing(true);
    }

    try {
      // 1. Fetch Health
      const healthResult = await gatewayApiClient.fetchHealth(4000);

      if (!isMountedRef.current) return;

      setLatencyMs(healthResult.latencyMs);
      setLastChecked(new Date());

      if (healthResult.success && healthResult.data) {
        setHealthData(healthResult.data);
        setConnectionStatus('connected');
        setErrorMessage(null);

        // 2. Fetch Admin Overview if available
        try {
          const adminResult = await gatewayApiClient.fetchAdminOverview(3000);
          if (isMountedRef.current && adminResult.success && adminResult.data) {
            setAdminOverview(adminResult.data);
          }
        } catch {
          // Admin Overview is optional
        }
      } else {
        setConnectionStatus('offline');
        setErrorMessage(healthResult.errorMessage || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ Gateway ได้');
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setConnectionStatus('error');
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ');
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  // Polling Effect
  useEffect(() => {
    isMountedRef.current = true;
    fetchLiveStatus(false);
    verifySession();

    if (autoRefreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchLiveStatus(false);
      if (isAuthenticated) {
        gatewayApiClient.fetchAuthenticatedModules().then((res) => {
          if (isMountedRef.current && res.success && res.data) {
            setAuthenticatedModules(res.data);
          }
        });
      }
    }, autoRefreshInterval);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchLiveStatus, verifySession, autoRefreshInterval, isAuthenticated]);

  const updateEndpointUrl = (url: string) => {
    gatewayApiClient.setBaseUrl(url);
    setCustomEndpoint(url);
    fetchLiveStatus(true);
    verifySession();
  };

  const handleLogin = async (user: string, pass: string) => {
    const res = await gatewayApiClient.login(user, pass);
    if (res.success) {
      setIsAuthenticated(true);
      setAdminUser(res.user || null);
      const modRes = await gatewayApiClient.fetchAuthenticatedModules();
      if (modRes.success && modRes.data) {
        setAuthenticatedModules(modRes.data);
      }
      return { success: true };
    }
    return { success: false, error: res.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  };

  const handleLogout = async () => {
    await gatewayApiClient.logout();
    setIsAuthenticated(false);
    setAdminUser(null);
    setAuthenticatedModules(null);
  };

  const refreshModules = async () => {
    if (!isAuthenticated) return;
    setIsLoadingModules(true);
    const modRes = await gatewayApiClient.fetchAuthenticatedModules();
    if (modRes.success && modRes.data) {
      setAuthenticatedModules(modRes.data);
    }
    setIsLoadingModules(false);
  };

  return {
    connectionStatus,
    healthData,
    adminOverview,
    latencyMs,
    lastChecked,
    errorMessage,
    isRefreshing,
    autoRefreshInterval,
    setAutoRefreshInterval,
    customEndpoint,
    updateEndpointUrl,
    refresh: () => fetchLiveStatus(true),
    // Auth & Session
    isAuthenticated,
    adminUser,
    authenticatedModules,
    isLoadingModules,
    login: handleLogin,
    logout: handleLogout,
    refreshModules
  };
}

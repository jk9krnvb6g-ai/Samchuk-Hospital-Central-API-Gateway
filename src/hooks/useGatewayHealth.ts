/**
 * @file src/hooks/useGatewayHealth.ts
 * Real-time Gateway Health & Diagnostics Hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GatewayHealthResponse,
  GatewayAdminOverview,
  ConnectionStatus
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

  const isMountedRef = useRef<boolean>(true);

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

        // Admin API is protected by server-side Bearer authentication.
        // Do not send anonymous polling requests or embed admin tokens in browsers.
        setAdminOverview(null);

      } else {
        setHealthData(null);
        setAdminOverview(null);
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

    if (autoRefreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchLiveStatus(false);
    }, autoRefreshInterval);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchLiveStatus, autoRefreshInterval]);

  const updateEndpointUrl = (url: string) => {
    gatewayApiClient.setBaseUrl(url);
    setCustomEndpoint(url);
    fetchLiveStatus(true);
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
    refresh: () => fetchLiveStatus(true)
  };
}

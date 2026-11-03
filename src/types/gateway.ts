/**
 * @file src/types/gateway.ts
 * TypeScript interfaces and types for Samchuk Hospital Central API Gateway V2 Management Console
 */

export type GatewayHealthStatus = 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
export type ConnectionStatus = 'connected' | 'connecting' | 'offline' | 'error';
export type ModuleStatus = 'ACTIVE' | 'NOT_CONFIGURED' | 'DISABLED' | 'LOAD_ERROR' | 'INITIALIZING';

export interface ModuleRecord {
  id: string;
  name: string;
  prefix: string;
  status: ModuleStatus;
  enabled: boolean;
  required: boolean;
  loadedAt?: string | null;
  hasSourcePath: boolean;
  error?: string | null;
  listenerRisk?: boolean;
}

export interface AdminUser {
  username: string;
  role: string;
}

export interface GatewayHealthResponse {
  status: GatewayHealthStatus;
  gateway: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  protocol: string;
  port: number;
  // In Gateway V2, public probe omits subsystems and cors for security; available via authenticated session
  subsystems?: Record<string, ModuleRecord>;
  cors?: {
    allowedOrigins: string[];
  };
}

export interface GatewayAdminOverview {
  success: boolean;
  service: string;
  hospital: string;
  version: string;
  mode: string;
  mutationsEnabled: boolean;
  timestamp: string;
  gateway: {
    status: GatewayHealthStatus;
    port: number;
    host: string;
    protocol: string;
    uptimeSeconds: number;
    nodeVersion: string;
    environment: string;
  };
  security: {
    sslEnabled: boolean;
    targetIp: string;
    corsAllowedOrigins: string[];
    rateLimit: {
      windowMs: number;
      max: number;
    };
    authPolicy: string;
  };
  modules: Record<string, ModuleRecord>;
  monitoring: {
    metricsApiAvailable: boolean;
    message: string;
  };
  logs: {
    streamAvailable: boolean;
    logDirectory: string;
    message: string;
  };
}

export interface ApiClientState {
  connectionStatus: ConnectionStatus;
  health: GatewayHealthResponse | null;
  adminOverview: GatewayAdminOverview | null;
  latencyMs: number | null;
  lastChecked: Date | null;
  errorMessage: string | null;
  isPolling: boolean;
  activeEndpointUrl: string;
}

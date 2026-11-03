/**
 * @file src/services/gatewayApi.ts
 * Real API Client for Samchuk Hospital Central API Gateway V2
 * เชื่อมต่อกับ Backend Gateway จริง (HTTPS 3002 / IIS Reverse Proxy)
 * ปฏิบัติตามกฎความปลอดภัย: ห้ามสร้างข้อมูลปลอมเป็น Production และไม่ฝัง Token ใดๆ ในโค้ด
 */

import { GatewayHealthResponse, GatewayAdminOverview } from '../types/gateway';

export interface FetchResult<T> {
  success: boolean;
  data: T | null;
  latencyMs: number;
  status: number;
  errorMessage: string | null;
  timestamp: Date;
}

class GatewayApiClient {
  private baseUrl: string = '';

  constructor() {
    // กำหนดค่าเริ่มต้น:
    // หากอยู่ในสภาพแวดล้อม IIS Reverse Proxy (/Gateway/) หรือเดียวกัน ให้ใช้ relative path ''
    // หรือดึงจาก localStorage หากผู้ดูแลระบบเคยตั้งค่าไว้
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('samchuk_gateway_endpoint_url');
      if (savedUrl) {
        this.baseUrl = savedUrl.replace(/\/+$/, '');
      } else {
        // ค่าเริ่มต้น: ใช้ relative path เพื่อผ่าน IIS Reverse Proxy
        this.baseUrl = '';
      }
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.trim().replace(/\/+$/, '');
    if (typeof window !== 'undefined') {
      if (this.baseUrl) {
        localStorage.setItem('samchuk_gateway_endpoint_url', this.baseUrl);
      } else {
        localStorage.removeItem('samchuk_gateway_endpoint_url');
      }
    }
  }

  /**
   * ดึงข้อมูล Health Check จาก Gateway จริง (/api/health)
   */
  public async fetchHealth(timeoutMs: number = 4000): Promise<FetchResult<GatewayHealthResponse>> {
    const start = performance.now();
    const endpoint = `${this.baseUrl}/api/health`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Hospital-Client': 'Samchuk-Console-V2'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - start);

      if (!response.ok && response.status !== 503) {
        return {
          success: false,
          data: null,
          latencyMs,
          status: response.status,
          errorMessage: `เซิร์ฟเวอร์ตอบกลับรหัสข้อผิดพลาด HTTP ${response.status} (${response.statusText || 'Error'})`,
          timestamp: new Date()
        };
      }

      const data: GatewayHealthResponse = await response.json();
      return {
        success: true,
        data,
        latencyMs,
        status: response.status,
        errorMessage: null,
        timestamp: new Date()
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - start);
      let errorMsg = 'ไม่สามารถเชื่อมต่อ Central API Gateway ได้';

      if (err.name === 'AbortError') {
        errorMsg = `หมดเวลาการเชื่อมต่อ (Timeout เกิน ${timeoutMs / 1000} วินาที) กรุณาตรวจสอบว่าเซิร์ฟเวอร์กำลังรันอยู่บนพอร์ต 3002 หรือไม่`;
      } else if (err.message && err.message.includes('Failed to fetch')) {
        errorMsg = 'ไม่สามารถส่งคำขอ HTTP/HTTPS ได้ (Network Error หรือ CORS ปฏิเสธ หรือเซิร์ฟเวอร์ปิดอยู่)';
      } else if (err.message) {
        errorMsg = err.message;
      }

      return {
        success: false,
        data: null,
        latencyMs,
        status: 0,
        errorMessage: errorMsg,
        timestamp: new Date()
      };
    }
  }

  /**
   * ดึงข้อมูล Admin Overview จาก Gateway จริง (/api/gateway/admin/overview)
   */
  public async fetchAdminOverview(timeoutMs: number = 4000): Promise<FetchResult<GatewayAdminOverview>> {
    const start = performance.now();
    const endpoint = `${this.baseUrl}/api/gateway/admin/overview`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Hospital-Client': 'Samchuk-Console-V2'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - start);

      if (!response.ok) {
        return {
          success: false,
          data: null,
          latencyMs,
          status: response.status,
          errorMessage: `Management API ตอบกลับ HTTP ${response.status}`,
          timestamp: new Date()
        };
      }

      const data: GatewayAdminOverview = await response.json();
      return {
        success: true,
        data,
        latencyMs,
        status: response.status,
        errorMessage: null,
        timestamp: new Date()
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - start);
      return {
        success: false,
        data: null,
        latencyMs,
        status: 0,
        errorMessage: err.message || 'ไม่สามารถติดต่อ Management API ได้',
        timestamp: new Date()
      };
    }
  }
}

export const gatewayApiClient = new GatewayApiClient();

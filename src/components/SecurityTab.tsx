/**
 * @file src/components/SecurityTab.tsx
 * Authentication, TLS/SSL, CORS, and Hospital System Access Control Policy
 */

import React from 'react';
import {
  Shield,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Key,
  Globe,
  FileCheck,
  Ban,
  Layers,
  Cpu
} from 'lucide-react';

export const SecurityTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 1. Security Header & Status */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              นโยบายความมั่นคงปลอดภัยและสิทธิ์การเข้าถึง (Security & Access Control)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            มาตรฐานการป้องกันและแยกสิทธิ์ของ Central API Gateway โรงพยาบาลสามชุก
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Server-side Enforced</span>
          </span>
        </div>
      </div>

      {/* 2. Critical Security Principles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Principle 1: Tokenless Frontend */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3>การป้องกันการรั่วไหลของ Admin Token (Tokenless Architecture)</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            ตามข้อกำหนดความปลอดภัยขั้นสูงสุด: <strong>ห้ามฝัง <code>GATEWAY_ADMIN_TOKEN</code> ใน Frontend, Source Code หรือ Vite Environment ที่ถูก Build ลง Browser โดยเด็ดขาด</strong>
          </p>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>ไม่มี Secret หรือ Admin Token ในบันเดิล JavaScript</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>การตรวจสิทธิ์ทุกฟังก์ชันบริหารจัดการทำที่ฝั่ง Server เท่านั้น</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>เปิดใช้งานเฉพาะข้อมูลสถานะสาธารณะที่อนุญาต (Public Telemetry)</span>
            </div>
          </div>
        </div>

        {/* Principle 2: Mutation Policy */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <Ban className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <h3>นโยบายปิดคำสั่งเปลี่ยนสถานะ (Mutation Guard)</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            ในระยะที่ 1 นี้ ระบบตั้งค่า <code>GATEWAY_ADMIN_MUTATIONS_ENABLED = false</code> อย่างถาวร เพื่อป้องกันการแก้ไข หรือหยุดการทำงานของระบบสำคัญ
          </p>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>คำสั่ง POST / PUT / DELETE บน <code>/api/gateway/admin/*</code> ตอบกลับ 403 Forbidden</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>ไม่อนุญาตการ Unmount หรือ Stop Procurement โดยอัตโนมัติ</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>ระบบทำงานในโหมด Read-only Observer เท่านั้น</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Transport Layer Security & CORS Matrix */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>ตารางการบังคับใช้ความปลอดภัยทางเครือข่าย (Enforcement Matrix)</span>
          </h3>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
          {/* Row 1: TLS Certificate */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">TLS / HTTPS Configuration</div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                รองรับ Subject Alternative Name (SAN) ระบุ IP: 10.2.0.13
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                minVersion: TLSv1.2 (rejectUnauthorized: true)
              </span>
            </div>
          </div>

          {/* Row 2: CORS Allowlist */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">CORS Policy (ข้ามพอร์ต 3001 ➔ 3002)</div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                ไม่อนุญาต Wildcard '*' อนุญาตเฉพาะ Frontend ที่กำหนด
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-teal-700 dark:text-teal-300 font-semibold bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                https://10.2.0.13:3001, https://localhost:3001
              </span>
            </div>
          </div>

          {/* Row 3: Rate Limiting */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">In-Memory Rate Limiter</div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                ป้องกันการยิงคำขอถี่เกินเกณฑ์เพื่อรักษาเสถียรภาพฐานข้อมูล
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                600 requests / 60 วินาที
              </span>
            </div>
          </div>

          {/* Row 4: Procurement Auth Isolation */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Procurement Authentication Isolation</div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                คงระบบ Login / JWT / Session เดิมของ Procurement 100%
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                100% Isolated & Untouched
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

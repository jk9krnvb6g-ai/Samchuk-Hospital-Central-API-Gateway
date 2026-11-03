/**
 * @file src/components/LogsAuditTab.tsx
 * Logs & Audit Trail Management Screen
 * นโยบายความปลอดภัยเคร่งครัด: ไม่เปิดเผย Passwords, Tokens, Secrets หรือข้อมูลส่วนบุคคล (CID/เลขบัตรประชาชน)
 */

import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  Shield,
  Lock,
  AlertTriangle,
  Info,
  Calendar,
  Download,
  Terminal,
  EyeOff
} from 'lucide-react';

export const LogsAuditTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [subsystemFilter, setSubsystemFilter] = useState<string>('ALL');

  return (
    <div className="space-y-6">
      {/* 1. Log Location & Security Masking Policy Banner */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              ระบบบันทึกประวัติการเรียกใช้งาน (Audit Logs & Trail)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            บันทึกคำขอ API ทั้งหมดลงไฟล์บนเซิร์ฟเวอร์รายวัน พร้อมกลไก Masking ข้อมูลความลับอัตโนมัติ
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">ตำแหน่งไฟล์บนเซิร์ฟเวอร์:</span>
          <code className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
            C:\inetpub\wwwroot\Central-API\logs\
          </code>
        </div>
      </div>

      {/* 2. Privacy & Sanitization Guarantee Card */}
      <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/20 text-xs text-teal-900 dark:text-teal-200">
        <div className="flex items-start gap-3">
          <EyeOff className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-bold">นโยบายการปกปิดข้อมูลสำคัญ (Sanitized Audit Policy):</strong>
            {' '}เพื่อความปลอดภัยของข้อมูลผู้ป่วยและเจ้าหน้าที่โรงพยาบาลสามชุก มิดเดิลแวร์ <code>middleware/logger.js</code> จะทำการ Masking ปิดบังข้อมูลอ่อนไหวโดยอัตโนมัติ ได้แก่:
            <div className="mt-1 flex flex-wrap gap-1.5 font-mono text-[11px]">
              <span className="bg-teal-100 dark:bg-teal-900/50 px-1.5 py-0.5 rounded text-teal-800 dark:text-teal-300">password: [REDACTED]</span>
              <span className="bg-teal-100 dark:bg-teal-900/50 px-1.5 py-0.5 rounded text-teal-800 dark:text-teal-300">authorization: [MASKED]</span>
              <span className="bg-teal-100 dark:bg-teal-900/50 px-1.5 py-0.5 rounded text-teal-800 dark:text-teal-300">cid (เลขบัตรประชาชน): [REDACTED]</span>
              <span className="bg-teal-100 dark:bg-teal-900/50 px-1.5 py-0.5 rounded text-teal-800 dark:text-teal-300">token & cookie: [REDACTED]</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหา Correlation ID, IP, หรือ URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Level Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">ระดับ:</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">ทั้งหมด (All Levels)</option>
              <option value="INFO">INFO (200 OK)</option>
              <option value="WARN">WARN (4xx Client Errors)</option>
              <option value="ERROR">ERROR (5xx Server Errors)</option>
            </select>
          </div>

          {/* Subsystem Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">ระบบ:</span>
            <select
              value={subsystemFilter}
              onChange={(e) => setSubsystemFilter(e.target.value)}
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">ทุกระบบ</option>
              <option value="Procurement">Procurement (จัดซื้อ)</option>
              <option value="Sam_Att">Sam_Att (ลงเวลา)</option>
              <option value="Cash_Cheque">Cash_Cheque (การเงิน)</option>
              <option value="Gateway">Gateway Core</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Stream Status & Unavailable State (Explaining Real Situation Honestly) */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="py-12 px-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Terminal className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            สตรีม Log ออนไลน์ยังไม่เปิดเผยผ่านเครือข่าย (HTTP Stream Unavailable)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            ตามมาตรฐานความมั่นคงปลอดภัยสารสนเทศโรงพยาบาล Log การทำงานทั้งหมดถูกจัดเก็บไว้ใน Local Filesystem บนเครื่อง Windows Server เท่านั้น และยังไม่มีการเปิด HTTP Stream Endpoint สู่เบราว์เซอร์เพื่อป้องกันการดักจับข้อมูล
          </p>

          <div className="pt-3">
            <div className="inline-block p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left font-mono text-xs max-w-2xl text-slate-700 dark:text-slate-300">
              <div className="text-[11px] text-slate-500 font-sans mb-1 font-semibold">
                ตัวอย่างรูปแบบข้อความในไฟล์ Log ประจำวัน (gateway-YYYY-MM-DD.log):
              </div>
              <div className="text-emerald-700 dark:text-emerald-400">
                [2026-11-03T09:44:37.665Z] [samchuk-1793699077665-c5bee4d7] 10.2.0.13 GET /api/health 200 0.39ms (Auth: none)
              </div>
              <div className="text-amber-700 dark:text-amber-400 mt-1">
                [2026-11-03T09:44:37.660Z] [samchuk-1793699077659-e58010d1] 10.2.0.13 GET /api/Procurement/orders 503 1.20ms (Module: NOT_CONFIGURED)
              </div>
              <div className="text-rose-700 dark:text-rose-400 mt-1">
                [2026-11-03T09:44:37.664Z] [samchuk-1793699077664-64812177] 192.168.1.99 GET /api/health 403 0.88ms [CORS REJECTED]
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400">
            หากต้องการตรวจสอบ Log ตัวจริง สามารถเปิดดูได้ผ่าน Remote Desktop หรือ PowerShell ที่โฟลเดอร์ <code>C:\inetpub\wwwroot\Central-API\logs\</code>
          </div>
        </div>
      </div>
    </div>
  );
};

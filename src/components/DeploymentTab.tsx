/**
 * @file src/components/DeploymentTab.tsx
 * IIS Deployment Guide for /Gateway/, Server Blueprints, Source Inspector, and Test Suite
 */

import React, { useState } from 'react';
import {
  Terminal,
  FileText,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Code2,
  Server,
  FolderGit2,
  Shield,
  Layers
} from 'lucide-react';
import { CENTRAL_API_FILES, SourceFile } from '../data/sourceCodeStore';
import { TEST_SUITES_DATA } from '../data/projectFiles';

interface DeploymentTabProps {
  onDownloadZip: () => void;
}

export const DeploymentTab: React.FC<DeploymentTabProps> = ({ onDownloadZip }) => {
  const [subTab, setSubTab] = useState<'iis-guide' | 'scripts' | 'source' | 'tests'>('iis-guide');
  const [selectedFileId, setSelectedFileId] = useState<string>('index-js');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const selectedFile = CENTRAL_API_FILES.find(f => f.id === selectedFileId) || CENTRAL_API_FILES[0];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Subtabs */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              คู่มือการติดตั้ง IIS และคลังซอร์สโค้ด (Deployment & Blueprint)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            แนวทางการติดตั้ง Console ที่ <code>https://10.2.0.13:3001/Gateway/</code> และตรวจสอบพิมพ์เขียวระบบ
          </p>
        </div>

        <button
          onClick={onDownloadZip}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>ดาวน์โหลด ZIP โครงการ (samchuk-central-api-gateway.zip)</span>
        </button>
      </div>

      {/* Subtab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs">
        {[
          { id: 'iis-guide', label: '1. ขั้นตอนติดตั้งบน IIS (/Gateway/)', icon: Server },
          { id: 'scripts', label: '2. สคริปต์ Windows BAT', icon: Terminal },
          { id: 'source', label: '3. สำรวจซอร์สโค้ด Gateway ทั้งหมด', icon: Code2 },
          { id: 'tests', label: '4. รายงานทดสอบอัตโนมัติ (10/10 PASS)', icon: CheckCircle2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                isActive
                  ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: IIS DEPLOYMENT GUIDE */}
      {subTab === 'iis-guide' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              ขั้นตอนการ Build และ Deploy Management Console บน IIS ที่ URL: https://10.2.0.13:3001/Gateway/
            </h3>

            {/* Step 1 */}
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-300 flex items-center justify-center text-[11px] font-bold">1</span>
                <span>สร้างไฟล์ Production Build ด้วย Base Path <code>/Gateway/</code>:</span>
              </div>
              <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-xs flex items-center justify-between">
                <span>npm run build</span>
                <button
                  onClick={() => handleCopy('npm run build', 'cmd-build')}
                  className="text-teal-400 hover:text-teal-300"
                >
                  {copiedText === 'cmd-build' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-slate-500 text-[11px]">
                ไฟล์ <code>vite.config.ts</code> ได้รับการตั้งค่า <code>base: './'</code> ไว้แล้ว ทำให้ไฟล์ assets ภายในโฟลเดอร์ <code>dist/</code> สามารถทำงานภายใต้ Virtual Directory <code>/Gateway/</code> หรือ Root Path ได้ทันทีโดยไม่ต้องแก้พาธ
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-2 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-300 flex items-center justify-center text-[11px] font-bold">2</span>
                <span>คัดลอกไฟล์ไปยังโฟลเดอร์ IIS บน Windows Server:</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                นำไฟล์และโฟลเดอร์ทั้งหมดจาก <code>dist/</code> ไปวางที่:
              </p>
              <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-xs flex items-center justify-between">
                <span>C:\inetpub\wwwroot\Gateway\</span>
                <button
                  onClick={() => handleCopy('C:\\inetpub\\wwwroot\\Gateway\\', 'cmd-path')}
                  className="text-teal-400 hover:text-teal-300"
                >
                  {copiedText === 'cmd-path' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Step 3 */}
            <div className="space-y-2 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-300 flex items-center justify-center text-[11px] font-bold">3</span>
                <span>ตั้งค่า IIS Application & Reverse Proxy สำหรับ /api:</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                สร้างไฟล์ <code>web.config</code> ในโฟลเดอร์ <code>C:\inetpub\wwwroot\Gateway\web.config</code> เพื่อให้ IIS ทำงานกับ React Single Page App และส่งต่อ <code>/api/*</code> ไปยัง Gateway พอร์ต 3002:
              </p>
              <div className="bg-slate-950 p-4 rounded-lg font-mono text-[11px] text-teal-300 overflow-x-auto border border-slate-800">
                <pre>{`<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Reverse Proxy สำหรับ API ไปยัง Gateway Port 3002 -->
        <rule name="ReverseProxyToGateway" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="https://127.0.0.1:3002/api/{R:1}" />
        </rule>
        <!-- SPA Fallback -->
        <rule name="SPA Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/Gateway/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>`}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: WINDOWS BAT SCRIPTS */}
      {subTab === 'scripts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                name: 'check-port.bat',
                title: 'ตรวจสอบพอร์ต 3002',
                desc: 'ตรวจสอบว่าพอร์ต 3002 กำลังถูกใช้งานโดย Process ใด (แสดง PID ชัดเจน) และห้าม taskkill /F อัตโนมัติ'
              },
              {
                name: 'start-gateway.bat',
                title: 'เริ่มทำงาน Central Gateway',
                desc: 'ตรวจสอบพอร์ตซ้ำซ้อน บันทึก gateway.pid และเริ่มรัน Node.js Background พร้อมบันทึก Log'
              },
              {
                name: 'stop-gateway.bat',
                title: 'หยุดการทำงานอย่างปลอดภัย',
                desc: 'ส่งสัญญาณ Graceful Shutdown เฉพาะ PID ของ Gateway เท่านั้น โดยไม่กระทบ Process อื่น'
              },
              {
                name: 'status-gateway.bat',
                title: 'ตรวจสอบสถานะ 3 มิติ',
                desc: 'ตรวจเช็คไฟล์ gateway.pid, ตรวจสอบการฟัง TCP บนพอร์ต 3002 และเรียกทดสอบ Health API'
              }
            ].map(s => (
              <div key={s.name} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-teal-600 dark:text-teal-400">{s.name}</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Windows BAT</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{s.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.desc}</p>
                <div className="pt-2 text-[11px] font-mono text-slate-500">
                  พาธ: <code>C:\inetpub\wwwroot\Central-API\scripts\{s.name}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: SOURCE CODE EXPLORER */}
      {subTab === 'source' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-3 h-[600px] flex flex-col">
            <div className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 px-2 py-1 mb-2">
              ไฟล์ในโครงการ ({CENTRAL_API_FILES.length})
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
              {CENTRAL_API_FILES.map(f => {
                const isSelected = f.id === selectedFileId;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFileId(f.id)}
                    className={`w-full text-left p-2 rounded-lg text-xs font-mono transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{f.path}</span>
                    <span className="text-[10px] text-slate-400 uppercase">{f.extension}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-8 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-950 p-4 h-[600px] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-2">
              <span className="font-mono text-xs text-teal-300 font-bold">{selectedFile.path}</span>
              <button
                onClick={() => handleCopy(selectedFile.content, selectedFile.id)}
                className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 font-sans"
              >
                {copiedText === selectedFile.id ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>คัดลอกโค้ด</span>
              </button>
            </div>
            <div className="flex-1 overflow-auto text-xs font-mono text-slate-300 custom-scrollbar leading-relaxed">
              <pre>{selectedFile.content}</pre>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: TEST SUITE */}
      {subTab === 'tests' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold">ผลทดสอบอัตโนมัติ (In-Process Test Suite): ผ่านครบ 10 จาก 10 ข้อ (100% PASS)</span>
            </div>
            <span className="font-mono text-[11px] bg-emerald-200 dark:bg-emerald-900 px-2 py-0.5 rounded">
              Zero Network Socket
            </span>
          </div>

          <div className="space-y-2">
            {TEST_SUITES_DATA.map(t => (
              <div key={t.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-white">
                    ข้อที่ {t.id}: {t.name}
                  </div>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
                    ✓ {t.status}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-1">{t.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

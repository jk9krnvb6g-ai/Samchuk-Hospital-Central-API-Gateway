/**
 * @file src/components/ModuleManagerTab.tsx
 * Module Manager & Subsystem Registry Console with Server-side Session Authentication
 * บริหารจัดการโมดูลระบบโรงพยาบาลสามชุก (Procurement, Sam_Att, Cash_Cheque, Inventory)
 * ปฏิบัติตามกฎความปลอดภัย: Procurement เป็น Protected Module, ทุกการจัดการเป็น Read-Only ในระยะแรก
 */

import React, { useState } from 'react';
import {
  Layers,
  Shield,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Database,
  Search,
  X,
  LogIn,
  LogOut,
  UserCheck,
  Activity,
  KeyRound,
  Eye,
  RefreshCw
} from 'lucide-react';
import { ModuleRecord, AdminUser } from '../types/gateway';
import { gatewayApiClient } from '../services/gatewayApi';

interface ModuleManagerTabProps {
  modules: Record<string, ModuleRecord> | null;
  isAuthenticated: boolean;
  adminUser: AdminUser | null;
  isLoadingModules: boolean;
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onLogout: () => void;
  onRefresh: () => void;
}

export const ModuleManagerTab: React.FC<ModuleManagerTabProps> = ({
  modules,
  isAuthenticated,
  adminUser,
  isLoadingModules,
  onLogin,
  onLogout,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<ModuleRecord | null>(null);
  const [moduleHealthDetail, setModuleHealthDetail] = useState<any>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState<boolean>(false);

  // Login Form State
  const [usernameInput, setUsernameInput] = useState<string>('admin');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState<boolean>(false);

  const handleLoginFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmittingLogin(true);
    try {
      const res = await onLogin(usernameInput, passwordInput);
      if (!res.success) {
        setLoginError(res.error || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
      } else {
        setPasswordInput('');
      }
    } catch (err: any) {
      setLoginError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleInspectModule = async (m: ModuleRecord) => {
    setSelectedModule(m);
    setModuleHealthDetail(null);
    setIsLoadingHealth(true);
    try {
      const health = await gatewayApiClient.fetchModuleHealth(m.id);
      setModuleHealthDetail(health);
    } catch (err: any) {
      setModuleHealthDetail({ error: err.message });
    } finally {
      setIsLoadingHealth(false);
    }
  };

  const moduleList = modules ? Object.values(modules) : [];

  const filteredModules = moduleList.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.prefix.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 1. Header Information */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              ระบบจัดการโมดูลศูนย์กลาง (Central Module Registry)
            </h2>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
              Gateway V2
            </span>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              Phase 1 Read-Only
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ลงทะเบียนและ Mount Express Router จากระบบย่อยเข้าสู่ HTTPS พอร์ต 3002 เพียงจุดเดียว
          </p>
        </div>

        {isAuthenticated && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อโมดูล หรือ Prefix..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 w-64"
              />
            </div>
            <button
              onClick={onRefresh}
              title="รีเฟรชข้อมูล Registry"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingModules ? 'animate-spin text-teal-500' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* 2. Unauthenticated State: In-place Admin Login Form */}
      {!isAuthenticated && (
        <div className="border border-amber-300 dark:border-amber-900/60 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 p-6 md:p-8 shadow-sm">
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-200 dark:border-amber-800/80">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ต้องยืนยันตัวตนผู้ดูแลระบบ (Admin Authentication Required)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                ตามนโยบายความมั่นคงปลอดภัยของโรงพยาบาลสามชุก การเข้าถึงรายการโมดูลและการตรวจสอบ Registry เชิงลึกถูกควบคุมด้วย <strong>Server-side Session (HttpOnly SameSite Cookie)</strong> โดยไม่มีการเปิดเผย Token ไปยังเบราว์เซอร์
              </p>
            </div>

            <form onSubmit={handleLoginFormSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-md space-y-4">
              {loginError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อผู้ใช้งานผู้ดูแลระบบ (Username)
                </label>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  รหัสผ่าน (Password)
                </label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  สำหรับทดสอบระบบ IT: บัญชีเริ่มต้น <code>admin</code> / รหัสผ่านตามค่า <code>GATEWAY_CONSOLE_PASSWORD</code>
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmittingLogin}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isSubmittingLogin ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังตรวจสอบสิทธิ์...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>เข้าสู่ระบบเพื่อจัดการโมดูล</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center text-[11px] text-slate-500 dark:text-slate-400">
              🔒 ความปลอดภัย: ใช้ HTTPS + HttpOnly Signed Cookie · ไม่บันทึก Token ใน localStorage
            </div>
          </div>
        </div>
      )}

      {/* 3. Authenticated State: Procurement Special Protection Alert Card */}
      {isAuthenticated && (
        <>
          <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/20 text-xs text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-bold">นโยบายคุ้มครองระบบจัดซื้อจัดจ้าง (Procurement Protection Policy):</strong>
                {' '}ระบบจัดซื้อจัดจ้างถือเป็นระบบหลักสำคัญยิ่งยวดของโรงพยาบาลสามชุก (Required Subsystem) Gateway ป้องกันไม่ให้มีคำสั่ง <code>Stop</code>, <code>Reload</code> หรือ <code>Rollback</code> ต่อระบบจัดซื้อ และรักษาระบบฐานข้อมูลและ Authentication เดิมไว้โดยไม่เข้าไปแทรกแซง
              </div>
            </div>

            {adminUser && (
              <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900 text-slate-700 dark:text-slate-300">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-semibold text-[11px]">{adminUser.username}</span>
                <span className="text-[10px] text-slate-400">({adminUser.role})</span>
                <button
                  onClick={onLogout}
                  title="ออกจากระบบ"
                  className="ml-2 text-rose-500 hover:text-rose-700 text-[11px] underline"
                >
                  ออก
                </button>
              </div>
            )}
          </div>

          {/* 4. Modules Table from Real Registry */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">ชื่อระบบ (Subsystem)</th>
                    <th className="py-3 px-4">API Prefix (HTTPS 3002)</th>
                    <th className="py-3 px-4">บทบาท (Role)</th>
                    <th className="py-3 px-4">สถานะการโหลด (Status)</th>
                    <th className="py-3 px-4">การแยกฐานข้อมูล</th>
                    <th className="py-3 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredModules.map((m) => {
                    const isProcurement = m.id === 'procurement';
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                        {/* Name */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {m.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            ID: {m.id}
                          </div>
                        </td>

                        {/* Prefix */}
                        <td className="py-3 px-4">
                          <code className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-mono text-[11px] border border-teal-200 dark:border-teal-800">
                            {m.prefix}
                          </code>
                        </td>

                        {/* Role */}
                        <td className="py-3 px-4">
                          {isProcurement ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                              <Lock className="w-3 h-3" />
                              <span>Required (Protected)</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Pluggable Subsystem
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {m.status === 'ACTIVE' && (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>ACTIVE (พร้อมทำงาน)</span>
                            </span>
                          )}
                          {m.status === 'NOT_CONFIGURED' && (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400" title="ยังไม่ได้ใส่พาธไฟล์จริง หรือรอการสลับระบบ">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>NOT_CONFIGURED (Adapter Safe)</span>
                            </span>
                          )}
                          {m.status === 'DISABLED' && (
                            <span className="text-slate-400 dark:text-slate-500">
                              DISABLED (ปิดใช้งาน)
                            </span>
                          )}
                        </td>

                        {/* DB Isolation */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                            <Database className="w-3 h-3 text-teal-500" />
                            <span>Module DB Pool</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleInspectModule(m)}
                              className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>ตรวจสุขภาพ</span>
                            </button>

                            {/* Status Change Buttons (Explicitly disabled in Phase 1 / Protected for Procurement) */}
                            <button
                              disabled
                              title={
                                isProcurement
                                  ? 'ระบบ Procurement ได้รับการคุ้มครองตามนโยบายโรงพยาบาล ห้ามเปลี่ยนสถานะ'
                                  : 'คำสั่งเปลี่ยนสถานะถูกปิดการใช้งานในระยะแรก (GATEWAY_ADMIN_MUTATIONS_ENABLED=false)'
                              }
                              className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 rounded border border-slate-200 dark:border-slate-800 cursor-not-allowed flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3" />
                              <span>{isProcurement ? 'Protected' : 'Read-Only'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Future Modules Preparation (e.g. Inventory) */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
              <Code2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h3>การเตรียมพร้อมสำหรับระบบใหม่ในอนาคต (Extensible Architecture)</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Central API Gateway ถูกออกแบบให้สามารถเพิ่มระบบใหม่ เช่น <strong>ระบบพัสดุและคลังยา (Inventory)</strong> หรือระบบสารบรรณ ได้อย่างง่ายดาย เพียงสร้างไฟล์ Router ที่ export <code>express.Router()</code> และเพิ่มพาธลงในไฟล์ <code>.env</code> โดยไม่ต้องแก้ไขซอร์สโค้ดหลักของ Gateway
            </p>
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300">
              <div># ตัวอย่างการเปิดใช้งานระบบคลังยาในไฟล์ .env</div>
              <div className="text-teal-600 dark:text-teal-400 font-semibold">MODULE_INVENTORY_ENABLED=true</div>
              <div className="text-teal-600 dark:text-teal-400 font-semibold">MODULE_INVENTORY_PATH=C:\inetpub\wwwroot\Inventory\backend\router.js</div>
            </div>
          </div>
        </>
      )}

      {/* 6. Detail Modal / Health Inspection */}
      {selectedModule && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  รายละเอียดโมดูล: {selectedModule.name}
                </h3>
                <span className="font-mono text-xs text-teal-600 dark:text-teal-400">
                  API Prefix: {selectedModule.prefix}
                </span>
              </div>
              <button
                onClick={() => { setSelectedModule(null); setModuleHealthDetail(null); }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Module ID:</span>
                  <span className="font-mono font-medium">{selectedModule.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">สถานะปัจจุบัน:</span>
                  <span className="font-semibold">{selectedModule.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">บทบาทความสำคัญ:</span>
                  <span>{selectedModule.required ? 'ระบบจำเป็นสูงสุด (Protected)' : 'โมดูลเสริม (Standard)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">สิทธิ์การควบคุม:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Read-Only ในระยะที่ 1</span>
                </div>
              </div>

              {/* Health Monitor Live Inspection Output */}
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2 font-semibold text-slate-800 dark:text-slate-200">
                  <Activity className="w-3.5 h-3.5 text-teal-500" />
                  <span>ผลการตรวจสุขภาพ (Live Health Monitor):</span>
                </div>
                {isLoadingHealth ? (
                  <div className="py-2 text-slate-500 flex items-center gap-2 text-xs">
                    <RefreshCw className="w-3 h-3 animate-spin text-teal-500" />
                    <span>กำลังตรวจสุขภาพโมดูลจาก Backend...</span>
                  </div>
                ) : moduleHealthDetail ? (
                  <div className="space-y-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    <div>Health: <strong className={moduleHealthDetail.healthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}>{moduleHealthDetail.healthy ? 'HEALTHY' : 'NOT_READY'}</strong></div>
                    <div>Source Path: {moduleHealthDetail.sourcePath || '(รอการเชื่อมต่อพาธไฟล์โครงการ)'}</div>
                    {moduleHealthDetail.reason && <div>Reason: {moduleHealthDetail.reason}</div>}
                  </div>
                ) : (
                  <div className="text-slate-400 text-[11px]">ไม่สามารถดึงข้อมูลผลตรวจได้</div>
                )}
              </div>

              {selectedModule.id === 'procurement' && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs">
                  <strong>การคุ้มครองพิเศษ:</strong> ระบบ Procurement เชื่อมโยงกับเวชภัณฑ์และการจัดซื้อของโรงพยาบาลสามชุก จึงถูกล็อคห้ามหยุดทำงานหรือรีโหลดผ่านคำสั่ง API ใดๆ
                </div>
              )}

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                  ข้อกำหนดของ Adapter Interface (Contract):
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                  <li>ต้องส่งออก Express Router ด้วย <code>module.exports = router;</code></li>
                  <li>ห้ามเรียก <code>app.listen()</code> หรือ <code>https.createServer()</code> ในตัวโมดูล</li>
                  <li>การเชื่อมต่อฐานข้อมูลและการตรวจสอบสิทธิ์ต้องทำงานภายในโมดูลอย่างเป็นเอกเทศ</li>
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => { setSelectedModule(null); setModuleHealthDetail(null); }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-lg"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

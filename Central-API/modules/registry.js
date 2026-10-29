/**
 * @file modules/registry.js
 * Central Module Registry & Dynamic Subsystem Loader
 * จัดการและลงทะเบียน Backend Router ของแต่ละระบบโรงพยาบาลสามชุกเข้ากับ Gateway
 */

const fs = require('fs');
const path = require('path');
const { validateSubsystemModule, createUnconfiguredRouter } = require('./adapter-interface');
const modulesConfig = require('../config/modules');

const express = require('express');

class ModuleRegistry {
  constructor() {
    this.modules = new Map();
    this.router = express.Router();
    this.isInitialized = false;
  }

  /**
   * เริ่มต้นโหลดระบบทั้งหมดตามการตั้งค่า
   */
  init() {
    if (this.isInitialized) return;

    for (const sub of modulesConfig.registeredSubsystems) {
      this.register(sub);
    }

    this.isInitialized = true;
    console.log(`[REGISTRY] ลงทะเบียนระบบเรียบร้อย (${this.modules.size} ระบบ)`);
  }

  /**
   * ลงทะเบียนระบบ (รองรับทั้งการลงทะเบียนอัตโนมัติ การส่ง router เข้ามาตรงๆ และการเพิ่มระบบใหม่ในอนาคต เช่น Inventory)
   * @param {object} moduleDef ข้อมูลระบบ
   */
  register(moduleDef) {
    const { id, name, prefix, enabled, externalPath, required, router: directRouter } = moduleDef;

    const record = {
      id,
      name,
      prefix,
      enabled: enabled !== false,
      required: Boolean(required),
      externalPath: externalPath || null,
      status: 'INITIALIZING', // INITIALIZING | ACTIVE | NOT_CONFIGURED | DISABLED | LOAD_ERROR
      router: null,
      error: null,
      loadedAt: null,
      healthCheck: null
    };

    if (!record.enabled) {
      record.status = 'DISABLED';
      this.modules.set(id, record);
      console.log(`[REGISTRY] ระบบ ${name} [${prefix}] ถูกปิดการใช้งาน (DISABLED)`);
      return record;
    }

    // กรณีที่ 1: มีการส่ง Router หรือ Adapter เข้ามาโดยตรง (Direct Router Injection)
    if (directRouter) {
      const validation = validateSubsystemModule(directRouter, id);
      if (validation.isValid) {
        record.router = validation.router;
        record.healthCheck = validation.healthCheck;
        record.status = 'ACTIVE';
        record.loadedAt = new Date().toISOString();
        console.log(`[REGISTRY SUCCESS] เชื่อมต่อ Router โดยตรงของระบบ ${name} สำเร็จที่ Prefix: ${prefix}`);
      } else {
        record.status = 'LOAD_ERROR';
        record.error = validation.error;
        record.router = createUnconfiguredRouter(record);
      }
      this.modules.set(id, record);
      return record;
    }

    // กรณีที่ 2: ไม่ได้ระบุ External Path หรือไฟล์ยังไม่มีอยู่จริง
    if (!record.externalPath || !fs.existsSync(path.resolve(record.externalPath))) {
      record.status = 'NOT_CONFIGURED';
      record.router = createUnconfiguredRouter(record);
      
      if (record.required) {
        console.warn(`[REGISTRY WARNING] ระบบหลักจำเป็น '${name}' (${prefix}) ยังไม่ได้ระบุไฟล์ Source Code จริงที่: ${record.externalPath || 'ไม่ระบุ'}`);
      } else {
        console.log(`[REGISTRY INFO] ระบบ ${name} (${prefix}) ใช้ Adapter Interface (สถานะ NOT_CONFIGURED)`);
      }

      this.modules.set(id, record);
      return record;
    }

    // กรณีที่ 3: โหลด Module จาก External Path ภายนอก
    try {
      const resolvedPath = path.resolve(record.externalPath);
      // เคลียร์ require cache เพื่อรองรับ hot reload หากจำเป็น
      delete require.cache[resolvedPath];
      const loaded = require(resolvedPath);

      const validation = validateSubsystemModule(loaded, id);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      record.router = validation.router;
      record.healthCheck = validation.healthCheck;
      record.status = 'ACTIVE';
      record.loadedAt = new Date().toISOString();
      console.log(`[REGISTRY SUCCESS] เชื่อมต่อระบบ ${name} สำเร็จที่ Prefix: ${prefix} จาก: ${resolvedPath}`);
    } catch (err) {
      record.status = 'LOAD_ERROR';
      record.error = err.message;
      record.router = createUnconfiguredRouter(record);

      console.error(`[REGISTRY ERROR] ไม่สามารถโหลด Module '${name}' จาก ${record.externalPath}:`, err.message);

      if (record.required) {
        console.error(`[CRITICAL ALERT] ระบบที่จำเป็น '${name}' โหลดล้มเหลว! กรุณาตรวจสอบ Source Code และ Node.js Dependencies ของระบบดังกล่าว`);
      }
    }

    this.modules.set(id, record);
    return record;
  }

  /**
   * นำ Router ทั้งหมดที่ลงทะเบียนไว้ไป Mount เข้ากับ Express Application
   * @param {import('express').Application} app 
   */
  mountAll(app) {
    if (!this.isInitialized) {
      this.init();
    }

    // ติดตั้ง dynamic dispatch router เข้ากับ app
    // ให้ตรวจสอบ route แบบ dynamic ทุกครั้ง ทำให้รองรับการลงทะเบียน module ใหม่ระหว่างรันไทม์ได้ทันที
    app.use((req, res, next) => {
      for (const record of this.modules.values()) {
        if (record.status !== 'DISABLED' && record.router) {
          if (req.originalUrl.startsWith(record.prefix)) {
            // ตัด prefix ออกเพื่อให้ sub-router ประมวลผลได้อย่างถูกต้อง
            const originalUrl = req.url;
            const originalBaseUrl = req.baseUrl;
            req.baseUrl = record.prefix;
            req.url = req.originalUrl.slice(record.prefix.length) || '/';

            return record.router(req, res, (err) => {
              // คืนค่า url เดิมหากโมดูลไม่ได้จัดการ request
              req.url = originalUrl;
              req.baseUrl = originalBaseUrl;
              next(err);
            });
          }
        }
      }
      next();
    });

    for (const [id, record] of this.modules.entries()) {
      console.log(`[MOUNT] ติดตั้ง Route: ${record.prefix} -> [${id}] Status: ${record.status}`);
    }
  }

  /**
   * สรุปสถานะความพร้อมของแต่ละโมดูลสำหรับ Health Check
   */
  getHealthSummary() {
    const summary = {};
    for (const [id, record] of this.modules.entries()) {
      summary[id] = {
        name: record.name,
        prefix: record.prefix,
        status: record.status,
        enabled: record.enabled,
        required: record.required,
        loadedAt: record.loadedAt,
        // ซ่อนพาธของไฟล์ใน Production เพื่อความปลอดภัย
        hasSourcePath: Boolean(record.externalPath)
      };
    }
    return summary;
  }

  /**
   * ค้นหาโมดูลตาม ID
   * @param {string} id 
   */
  getModule(id) {
    return this.modules.get(id);
  }

  /**
   * รายการโมดูลทั้งหมด
   */
  getAll() {
    return Array.from(this.modules.values());
  }
}

// Singleton Instance สำหรับการใช้งานทั่วทั้ง Gateway
const registry = new ModuleRegistry();

module.exports = registry;

/**
 * Gateway v2 - in-process module registry (phase 1).
 * No new HTTP listeners. Runtime controls are intentionally internal until
 * authenticated management endpoints and audit logging are implemented.
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const { validateSubsystemModule, createUnconfiguredRouter } = require('./adapter-interface');
const modulesConfig = require('../config/modules');

const STATES = Object.freeze({
  INITIALIZING: 'INITIALIZING',
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
  DRAINING: 'DRAINING',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  LOAD_ERROR: 'LOAD_ERROR'
});

class ModuleRegistry {
  constructor() {
    this.modules = new Map();
    this.isInitialized = false;
    this.isMounted = false;
  }

  init() {
    if (this.isInitialized) return;
    for (const definition of modulesConfig.registeredSubsystems) this.register(definition);
    this.isInitialized = true;
  }

  register(definition) {
    if (!definition || !definition.id || !definition.prefix) {
      throw new Error('Module id and prefix are required');
    }
    if (!/^\/api\/[A-Za-z0-9_-]+$/.test(definition.prefix)) {
      throw new Error('Invalid module prefix');
    }
    if (this.modules.has(definition.id)) throw new Error('Duplicate module id: ' + definition.id);
    const prefixLower = definition.prefix.toLowerCase();
    for (const existing of this.modules.values()) {
      if (existing.prefix.toLowerCase() === prefixLower) {
        throw new Error('Duplicate module prefix: ' + definition.prefix);
      }
    }

    const record = {
      id: definition.id,
      name: definition.name || definition.id,
      prefix: definition.prefix,
      enabled: definition.enabled !== false,
      required: Boolean(definition.required),
      externalPath: definition.externalPath || null,
      directRouter: definition.router || null,
      status: STATES.INITIALIZING,
      router: null,
      healthCheck: null,
      error: null,
      loadedAt: null,
      inFlight: 0,
      drainWaiters: []
    };
    this.modules.set(record.id, record);
    if (!record.enabled) {
      record.status = STATES.DISABLED;
    } else {
      this.load(record);
    }
    return record;
  }

  load(record) {
    record.error = null;
    record.router = null;
    record.healthCheck = null;
    try {
      let candidate = record.directRouter;
      if (!candidate) {
        if (!record.externalPath || !fs.existsSync(path.resolve(record.externalPath))) {
          record.status = STATES.NOT_CONFIGURED;
          record.router = createUnconfiguredRouter(record);
          return;
        }
        // Initial load only: do not attempt to hot-reload a dependency tree here.
        candidate = require(path.resolve(record.externalPath));
      }
      const result = validateSubsystemModule(candidate, record.id);
      if (!result.isValid) throw new Error(result.error);
      record.router = result.router;
      record.healthCheck = typeof result.healthCheck === 'function' ? result.healthCheck : null;
      record.loadedAt = new Date().toISOString();
      record.status = STATES.ACTIVE;
    } catch (error) {
      record.status = STATES.LOAD_ERROR;
      record.error = error.message;
      record.router = createUnconfiguredRouter(record);
    }
  }

  // Used only by a future authenticated management API.
  start(id) {
    const record = this.modules.get(id);
    if (!record) throw new Error('Unknown module');
    if (record.status === STATES.DRAINING) throw new Error('Module is draining');
    if (record.status === STATES.ACTIVE) return this.publicRecord(record);
    if (record.inFlight !== 0) throw new Error('Module still has active requests');
    record.enabled = true;
    this.load(record);
    return this.publicRecord(record);
  }

  async stop(id, { timeoutMs = 30000 } = {}) {
    const record = this.modules.get(id);
    if (!record) throw new Error('Unknown module');
    if (record.status === STATES.DISABLED) return this.publicRecord(record);
    if (record.status === STATES.DRAINING) throw new Error('Module is already draining');
    record.status = STATES.DRAINING;
    // Existing requests may finish. Do not forcibly destroy their sockets.
    if (record.inFlight > 0) {
      let timer;
      const completed = await Promise.race([
        new Promise(resolve => record.drainWaiters.push(resolve)),
        new Promise(resolve => { timer = setTimeout(() => resolve(false), timeoutMs); })
      ]);
      clearTimeout(timer);
      if (completed === false && record.inFlight > 0) {
        // Remain in DRAINING to avoid falsely claiming shutdown.
        throw new Error('Module drain timed out; module remains DRAINING');
      }
    }
    record.enabled = false;
    record.status = STATES.DISABLED;
    // Router remains in memory. Cleanup hooks and safe code reload come in phase 2.
    return this.publicRecord(record);
  }

  mountAll(app) {
    if (this.isMounted) throw new Error('Registry already mounted');
    this.init();
    this.isMounted = true;
    app.use((req, res, next) => {
      const pathname = (req.path || req.url.split('?')[0]);
      for (const record of this.modules.values()) {
        // Match a complete segment, not /api/ProcurementXYZ.
        if (pathname !== record.prefix && !pathname.startsWith(record.prefix + '/')) continue;
        if (record.status === STATES.DISABLED || record.status === STATES.DRAINING) {
          return res.status(503).json({ success: false, error: { code: 'MODULE_UNAVAILABLE', systemId: record.id } });
        }
        if (!record.router) return res.status(503).json({ success: false, error: { code: 'MODULE_UNAVAILABLE', systemId: record.id } });

        const previousUrl = req.url;
        const previousBaseUrl = req.baseUrl;
        req.baseUrl = previousBaseUrl + record.prefix;
        req.url = req.url.slice(record.prefix.length) || '/';
        if (req.url.startsWith('?')) req.url = '/' + req.url;
        record.inFlight++;
        let released = false;
        const release = () => {
          if (released) return;
          released = true;
          record.inFlight--;
          if (record.inFlight === 0) {
            for (const resolve of record.drainWaiters.splice(0)) resolve(true);
          }
        };
        res.once('finish', release);
        res.once('close', release);
        try {
          return record.router(req, res, err => {
            release();
            req.url = previousUrl;
            req.baseUrl = previousBaseUrl;
            next(err);
          });
        } catch (err) {
          release();
          req.url = previousUrl;
          req.baseUrl = previousBaseUrl;
          return next(err);
        }
      }
      next();
    });
  }

  publicRecord(record) {
    return {
      name: record.name,
      prefix: record.prefix,
      status: record.status,
      enabled: record.enabled,
      required: record.required,
      loadedAt: record.loadedAt,
      hasSourcePath: Boolean(record.externalPath),
      inFlight: record.inFlight
    };
  }

  getHealthSummary() {
    const result = {};
    for (const [id, record] of this.modules) result[id] = this.publicRecord(record);
    return result;
  }

  getModule(id) { return this.modules.get(id); }
  getAll() { return Array.from(this.modules.values()); }
}

const registry = new ModuleRegistry();
module.exports = registry;
module.exports.ModuleRegistry = ModuleRegistry;
module.exports.STATES = STATES;

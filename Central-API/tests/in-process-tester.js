/**
 * @file tests/in-process-tester.js
 * In-Process HTTP Mock Request Engine
 * จำลองการส่ง HTTP Request เข้าสู่ Express App โดยตรงภายใน Memory
 * ไม่มีการเปิด Network Socket หรือผูก Port ใดๆ ในระบบทั้งสิ้น
 */

const { EventEmitter } = require('events');

function sendInProcessRequest(app, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const req = new EventEmitter();
      req.method = (options.method || 'GET').toUpperCase();
      req.url = options.url || '/';
      req.originalUrl = req.url;
      req.headers = Object.assign({
        'host': '10.2.0.13:3002',
        'user-agent': 'InProcessTestEngine/1.0',
        'accept': 'application/json'
      }, options.headers || {});
      
      // แปลง headers key ให้เป็น lowercase
      const normalizedHeaders = {};
      for (const [k, v] of Object.entries(req.headers)) {
        normalizedHeaders[k.toLowerCase()] = v;
      }
      req.headers = normalizedHeaders;

      req.connection = { remoteAddress: options.ip || '10.2.0.13' };
      req.ip = options.ip || '10.2.0.13';
      req.body = options.body || {};
      req.query = options.query || {};

      const res = new EventEmitter();
      res.statusCode = 200;
      res._headers = {};
      
      res.setHeader = (name, value) => {
        res._headers[name.toLowerCase()] = value;
      };
      res.getHeader = (name) => res._headers[name.toLowerCase()];
      res.removeHeader = (name) => {
        delete res._headers[name.toLowerCase()];
      };

      let bodyData = null;

      res.status = (code) => {
        res.statusCode = code;
        return res;
      };

      res.json = (data) => {
        res.setHeader('content-type', 'application/json; charset=utf-8');
        bodyData = data;
        res.emit('finish');
        resolve({
          status: res.statusCode,
          headers: res._headers,
          body: bodyData
        });
        return res;
      };

      res.send = (data) => {
        bodyData = data;
        res.emit('finish');
        resolve({
          status: res.statusCode,
          headers: res._headers,
          body: bodyData
        });
        return res;
      };

      res.end = (chunk) => {
        if (chunk) bodyData = chunk;
        res.emit('finish');
        resolve({
          status: res.statusCode,
          headers: res._headers,
          body: bodyData
        });
        return res;
      };

      // ส่ง Request เข้าสู่ Express pipeline
      app(req, res);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  sendInProcessRequest
};

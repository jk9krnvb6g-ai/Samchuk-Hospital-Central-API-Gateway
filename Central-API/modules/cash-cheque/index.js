/**
 * @file modules/cash-cheque/index.js
 * Cash_Cheque Subsystem Gateway Adapter (ระบบเงินสดและเช็ค โรงพยาบาลสามชุก)
 * Prefix: /api/Cash_Cheque
 */

const path = require('path');
const fs = require('fs');
const config = require('../../config');
const { validateSubsystemModule, createUnconfiguredRouter } = require('../adapter-interface');

function createCashChequeRouter() {
  const externalPath = config.modules.cashCheque.externalPath;

  if (externalPath && fs.existsSync(path.resolve(externalPath))) {
    try {
      const resolved = path.resolve(externalPath);
      const importedModule = require(resolved);
      const validation = validateSubsystemModule(importedModule, 'cash-cheque');

      if (validation.isValid) {
        console.log(`[CASH_CHEQUE ADAPTER] โหลด Source Code จริงสำเร็จจาก: ${resolved}`);
        return validation.router;
      } else {
        console.error(`[CASH_CHEQUE ADAPTER] รูปแบบ Router ไม่ถูกต้อง: ${validation.error}`);
      }
    } catch (err) {
      console.error(`[CASH_CHEQUE ADAPTER] เกิดข้อผิดพลาดขณะโหลดระบบ Cash_Cheque: ${err.message}`);
    }
  }

  // หากยังไม่ได้เชื่อมต่อ ให้ใช้ Unconfigured Router แบบปลอดภัย
  return createUnconfiguredRouter({
    id: 'cash-cheque',
    name: 'Cash_Cheque (ระบบเงินสดและเช็ค)',
    prefix: '/api/Cash_Cheque'
  });
}

module.exports = {
  id: 'cash-cheque',
  name: 'Cash_Cheque (ระบบเงินสดและเช็ค)',
  prefix: '/api/Cash_Cheque',
  router: createCashChequeRouter()
};

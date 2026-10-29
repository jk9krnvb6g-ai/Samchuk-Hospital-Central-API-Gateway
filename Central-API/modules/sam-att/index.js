/**
 * @file modules/sam-att/index.js
 * Sam_Att Subsystem Gateway Adapter (ระบบลงเวลาปฏิบัติงาน โรงพยาบาลสามชุก)
 * Prefix: /api/Sam_Att
 */

const path = require('path');
const fs = require('fs');
const config = require('../../config');
const { validateSubsystemModule, createUnconfiguredRouter } = require('../adapter-interface');

function createSamAttRouter() {
  const externalPath = config.modules.samAtt.externalPath;

  if (externalPath && fs.existsSync(path.resolve(externalPath))) {
    try {
      const resolved = path.resolve(externalPath);
      const importedModule = require(resolved);
      const validation = validateSubsystemModule(importedModule, 'sam-att');

      if (validation.isValid) {
        console.log(`[SAM_ATT ADAPTER] โหลด Source Code จริงสำเร็จจาก: ${resolved}`);
        return validation.router;
      } else {
        console.error(`[SAM_ATT ADAPTER] รูปแบบ Router ไม่ถูกต้อง: ${validation.error}`);
      }
    } catch (err) {
      console.error(`[SAM_ATT ADAPTER] เกิดข้อผิดพลาดขณะโหลดระบบ Sam_Att: ${err.message}`);
    }
  }

  // หากยังไม่ได้เชื่อมต่อ ให้ใช้ Unconfigured Router แบบปลอดภัย
  return createUnconfiguredRouter({
    id: 'sam-att',
    name: 'Sam_Att (ระบบลงเวลาปฏิบัติงาน)',
    prefix: '/api/Sam_Att'
  });
}

module.exports = {
  id: 'sam-att',
  name: 'Sam_Att (ระบบลงเวลาปฏิบัติงาน)',
  prefix: '/api/Sam_Att',
  router: createSamAttRouter()
};

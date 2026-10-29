/**
 * @file config/modules.js
 * Definitions and registry configuration for Hospital Subsystems
 */

const config = require('./index');

module.exports = {
  // นิยามระบบทั้งหมดที่ Gateway รองรับ
  registeredSubsystems: [
    {
      id: 'procurement',
      name: 'Procurement (ระบบจัดซื้อจัดจ้าง)',
      prefix: '/api/Procurement',
      enabled: config.modules.procurement.enabled,
      externalPath: config.modules.procurement.externalPath,
      required: true // เป็นระบบสำคัญของโรงพยาบาล
    },
    {
      id: 'sam-att',
      name: 'Sam_Att (ระบบลงเวลาปฏิบัติงาน)',
      prefix: '/api/Sam_Att',
      enabled: config.modules.samAtt.enabled,
      externalPath: config.modules.samAtt.externalPath,
      required: false
    },
    {
      id: 'cash-cheque',
      name: 'Cash_Cheque (ระบบเงินสดและเช็ค)',
      prefix: '/api/Cash_Cheque',
      enabled: config.modules.cashCheque.enabled,
      externalPath: config.modules.cashCheque.externalPath,
      required: false
    },
    {
      id: 'inventory',
      name: 'Inventory (ระบบพัสดุและคลังยา)',
      prefix: '/api/Inventory',
      enabled: config.modules.inventory.enabled,
      externalPath: config.modules.inventory.externalPath,
      required: false
    }
  ]
};

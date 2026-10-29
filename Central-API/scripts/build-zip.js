/**
 * @file scripts/build-zip.js
 * Creates a standalone ZIP package of Central-API for deployment
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const zip = new JSZip();
const sourceDir = path.resolve(__dirname, '..');
const outputDir = path.resolve(__dirname, '..');
const outputZipPath = path.join(outputDir, 'samchuk-central-api-gateway.zip');

function addDirectoryToZip(currentDir, relativePath = '') {
  const items = fs.readdirSync(currentDir);

  for (const item of items) {
    // ข้ามโฟลเดอร์ที่ไม่จำเป็นต้องใส่ใน ZIP
    if (['node_modules', '.git', 'gateway.pid'].includes(item)) {
      continue;
    }
    if (item.endsWith('.zip')) {
      continue;
    }

    const fullPath = path.join(currentDir, item);
    const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      addDirectoryToZip(fullPath, itemRelativePath);
    } else {
      const fileData = fs.readFileSync(fullPath);
      zip.file(itemRelativePath, fileData);
    }
  }
}

async function buildZip() {
  console.log(`[ZIP BUILDER] เริ่มต้นบีบอัดไฟล์โครงการจาก ${sourceDir}...`);
  addDirectoryToZip(sourceDir);

  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  fs.writeFileSync(outputZipPath, content);
  const sizeKb = (content.length / 1024).toFixed(2);
  console.log(`[ZIP BUILDER] สร้างไฟล์สำเร็จ: ${outputZipPath} (${sizeKb} KB)`);
}

buildZip().catch(console.error);

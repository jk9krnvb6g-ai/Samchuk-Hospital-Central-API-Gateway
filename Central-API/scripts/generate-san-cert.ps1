<#
.SYNOPSIS
    สร้าง Self-Signed Certificate พร้อม Subject Alternative Name (SAN) IP: 10.2.0.13
    สำหรับ Samchuk Hospital Central API Gateway บน Windows Server
.DESCRIPTION
    สคริปต์นี้จะสร้าง Certificate และ Private Key ที่รองรับการเรียกผ่าน HTTPS IP โดยตรง:
    https://10.2.0.13:3002
    พร้อมส่งออกเป็นไฟล์ PEM (.crt, .key) และ PFX (.pfx) ลงในโฟลเดอร์ certs\
#>

[CmdletBinding()]
param (
    [string]$TargetIP = "10.2.0.13",
    [string]$OutputDir = "$PSScriptRoot\..\certs",
    [string]$CertPassword = "SamchukGatewaySecure2026!"
)

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  โรงพยาบาลสามชุก - สร้าง TLS Certificate สำหรับ IP $TargetIP  " -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

# 1. สร้างโฟลเดอร์ certs หากยังไม่มี
if (-not (Test-Path -Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    Write-Host "[+] สร้างโฟลเดอร์: $OutputDir" -ForegroundColor Green
}

$pfxPath = Join-Path $OutputDir "samchuk-gateway.pfx"
$crtPath = Join-Path $OutputDir "samchuk-gateway.crt"
$keyPath = Join-Path $OutputDir "samchuk-gateway.key"

# 2. สร้าง Self-Signed Certificate ลงใน Windows Certificate Store ชั่วคราว
Write-Host "[*] กำลังสร้าง Certificate พร้อม SAN IP: $TargetIP..." -ForegroundColor Yellow

$secPass = ConvertTo-SecureString -String $CertPassword -AsPlainText -Force

$cert = New-SelfSignedCertificate `
    -DnsName "localhost", "samchuk-gateway" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -NotAfter (Get-Date).AddYears(3) `
    -FriendlyName "Samchuk Hospital Central Gateway ($TargetIP)" `
    -KeyUsage DigitalSignature, KeyEncipherment `
    -Type SSLServerAuthentication `
    -TextExtension @("2.5.29.17={text}ipaddress=$TargetIP&dns=localhost&dns=10.2.0.13")

Write-Host "[+] Certificate ถูกสร้างเรียบร้อย (Thumbprint: $($cert.Thumbprint))" -ForegroundColor Green

# 3. Export เป็น PFX
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $secPass | Out-Null
Write-Host "[+] บันทึกไฟล์ PFX สำเร็จ: $pfxPath" -ForegroundColor Green

# 4. Export Public Certificate (.crt)
$certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
$certPem = "-----BEGIN CERTIFICATE-----`r`n" + [System.Convert]::ToBase64String($certBytes, [System.Base64FormattingOptions]::InsertLineBreaks) + "`r`n-----END CERTIFICATE-----`r`n"
[System.IO.File]::WriteAllText($crtPath, $certPem)
Write-Host "[+] บันทึกไฟล์ Certificate (.crt): $crtPath" -ForegroundColor Green

# 5. สรุปคำแนะนำการติดตั้งบน Windows Server
Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "ขั้นตอนการนำ Certificate ไปใช้งาน:" -ForegroundColor Yellow
Write-Host "1. ในไฟล์ .env ของ Gateway ตั้งค่าดังนี้:" -ForegroundColor White
Write-Host "   SSL_ENABLED=true" -ForegroundColor White
Write-Host "   SSL_PFX_PATH=$pfxPath" -ForegroundColor White
Write-Host "   SSL_PASSPHRASE=$CertPassword" -ForegroundColor White
Write-Host ""
Write-Host "2. เพื่อไม่ให้ Browser เตือน Certificate Warning (ไม่ปลอดภัย):" -ForegroundColor Yellow
Write-Host "   - นำไฟล์ $crtPath ไปติดตั้งในเครื่อง Client/Server" -ForegroundColor White
Write-Host "   - ดับเบิลคลิกไฟล์ samchuk-gateway.crt -> Install Certificate" -ForegroundColor White
Write-Host "   - เลือก Local Machine -> Trusted Root Certification Authorities" -ForegroundColor White
Write-Host "========================================================================" -ForegroundColor Cyan

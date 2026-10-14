from __future__ import annotations

import hashlib
import os
from pathlib import Path
import zipfile

ROOT = Path.cwd()
DIST = ROOT / "dist"
ZIP_PATH = DIST / "DopeFarm-Desktop.zip"

BAT = r"""@echo off
title DopeFarm - lokaler Spielserver
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve-game.ps1"
"""
PS1 = r"""$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$prefix = $root.TrimEnd('\') + '\'
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add('http://127.0.0.1:4173/')
try {
    $listener.Start()
} catch {
    Write-Host 'Port 4173 ist belegt. Bitte schließe die andere lokale Spielinstanz.' -ForegroundColor Red
    Read-Host 'Enter zum Beenden'
    exit 1
}
$url = 'http://127.0.0.1:4173/'
Write-Host 'DopeFarm läuft lokal. Dieses Fenster offen lassen.' -ForegroundColor Green
Write-Host ('Spiel: ' + $url)
Start-Process $url
try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        try {
            $relative = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
            if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
            $target = [System.IO.Path]::GetFullPath((Join-Path $root $relative))
            if (-not $target.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase) -and $target -ne (Join-Path $root 'index.html')) {
                $context.Response.StatusCode = 403
                $context.Response.Close()
                continue
            }
            if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
                $context.Response.StatusCode = 404
                $context.Response.Close()
                continue
            }
            $ext = [System.IO.Path]::GetExtension($target).ToLowerInvariant()
            $mime = switch ($ext) {
                '.html' { 'text/html; charset=utf-8' }
                '.js' { 'text/javascript; charset=utf-8' }
                '.css' { 'text/css; charset=utf-8' }
                '.json' { 'application/json; charset=utf-8' }
                '.svg' { 'image/svg+xml' }
                '.png' { 'image/png' }
                '.jpg' { 'image/jpeg' }
                '.webp' { 'image/webp' }
                '.woff2' { 'font/woff2' }
                '.txt' { 'text/plain; charset=utf-8' }
                default { 'application/octet-stream' }
            }
            $bytes = [System.IO.File]::ReadAllBytes($target)
            $context.Response.ContentType = $mime
            $context.Response.ContentLength64 = $bytes.Length
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            $context.Response.OutputStream.Close()
        } catch {
            try { $context.Response.StatusCode = 500; $context.Response.Close() } catch {}
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
"""
README = """DopeFarm — lokale Windows-Version

START
1. Dieses ZIP vollständig in einen eigenen Ordner entpacken.
2. start-game.bat doppelklicken.
3. Der Browser öffnet http://127.0.0.1:4173.
4. Das PowerShell-Fenster geöffnet lassen, solange das Spiel läuft.
5. Zum Beenden das PowerShell-Fenster schließen.

Es ist keine Node.js-Installation erforderlich. Der lokale Server nutzt Windows PowerShell/.NET.
Der Spielstand wird im Browserprofil auf diesem Rechner gespeichert. Für einen Umzug den Spielstand im Spiel exportieren.

Das Spiel ist eine persönliche, nicht-kommerzielle Web-Spielversion. Die Spielwerte sind fiktive Managementmechaniken.
Die Third-Party-Lizenzhinweise liegen in THIRD_PARTY_NOTICES.txt.
"""
if not DIST.is_dir() or not (DIST / "index.html").is_file():
    raise SystemExit("BUILD PACKAGE: FAIL — dist/index.html fehlt; zuerst den Produktionsbuild erfolgreich erstellen.")

(DIST / "start-game.bat").write_text(BAT, encoding="utf-8")
(DIST / "serve-game.ps1").write_text(PS1, encoding="utf-8")
(DIST / "README-LOKAL.txt").write_text(README, encoding="utf-8")
if not (DIST / "THIRD_PARTY_NOTICES.txt").is_file():
    raise SystemExit("BUILD PACKAGE: FAIL — THIRD_PARTY_NOTICES.txt fehlt.")

if ZIP_PATH.exists():
    ZIP_PATH.unlink()
with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted(DIST.rglob("*")):
        if not path.is_file() or path == ZIP_PATH or path.name == "dist.sha256":
            continue
        archive.write(path, path.relative_to(DIST).as_posix())

digest = hashlib.sha256(ZIP_PATH.read_bytes()).hexdigest()
(DIST / "DopeFarm-Desktop.zip.sha256").write_text(f"{digest}  DopeFarm-Desktop.zip\n", encoding="ascii")
print(f"BUILD PACKAGE: PASS — {ZIP_PATH.stat().st_size} bytes; SHA-256 {digest}")

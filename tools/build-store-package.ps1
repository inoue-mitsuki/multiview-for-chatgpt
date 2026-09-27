param([string]$DisplayName = 'MultiView for ChatGPT')
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$sourceDirectory = Join-Path $projectDirectory 'extension'
$manifest = Get-Content -LiteralPath (Join-Path $sourceDirectory 'manifest.json') -Raw | ConvertFrom-Json
$outputDirectory = Join-Path $projectDirectory ('release/build-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$packageDirectory = Join-Path $outputDirectory 'package'
$iconDirectory = Join-Path $packageDirectory 'icons'
New-Item -ItemType Directory -Path $iconDirectory -Force | Out-Null
foreach ($file in @('background.js','content.js','frame.js')) { Copy-Item -LiteralPath (Join-Path $sourceDirectory $file) -Destination $packageDirectory }

Add-Type -AssemblyName System.Drawing
$iconSource = [System.Drawing.Image]::FromFile((Join-Path $projectDirectory 'release/assets/multiview-icon.png'))
foreach ($size in @(16,32,48,128)) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($iconSource, 0, 0, $size, $size)
    $bitmap.Save((Join-Path $iconDirectory "icon$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose(); $bitmap.Dispose()
}
$iconSource.Dispose()
$manifest.name = $DisplayName
$manifest | Add-Member -NotePropertyName icons -NotePropertyValue @{ '16'='icons/icon16.png'; '32'='icons/icon32.png'; '48'='icons/icon48.png'; '128'='icons/icon128.png' } -Force
$manifest.action | Add-Member -NotePropertyName default_icon -NotePropertyValue @{ '16'='icons/icon16.png'; '32'='icons/icon32.png' } -Force
$json = $manifest | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText((Join-Path $packageDirectory 'manifest.json'), $json, (New-Object System.Text.UTF8Encoding($false)))

$promo = New-Object System.Drawing.Bitmap(440,280)
$g = [System.Drawing.Graphics]::FromImage($promo)
$g.Clear([System.Drawing.Color]::FromArgb(24,36,64))
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(55,115,230))
foreach ($point in @(@(90,32),@(224,32),@(90,154),@(224,154))) { $g.FillRectangle($brush,$point[0],$point[1],126,114) }
$promo.Save((Join-Path $outputDirectory 'promo-440x280.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$brush.Dispose(); $g.Dispose(); $promo.Dispose()
$zip = Join-Path $outputDirectory ('multiview-' + $manifest.version + '.zip')
Compress-Archive -Path (Join-Path $packageDirectory '*') -DestinationPath $zip
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($zip)
try {
    $entries = @($archive.Entries.FullName)
    if ($entries -notcontains 'manifest.json' -or $entries.Count -ne 8) { throw 'ZIP構成が不正です' }
} finally { $archive.Dispose() }
Get-FileHash -LiteralPath $zip -Algorithm SHA256 | Format-List
Write-Output "配布候補（未申請）: $zip"

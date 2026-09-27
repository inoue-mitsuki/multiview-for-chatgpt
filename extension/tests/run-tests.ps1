$ErrorActionPreference = 'Stop'
$extensionDirectory = Split-Path -Parent $PSScriptRoot

foreach ($scriptName in @('background.js', 'content.js', 'frame.js')) {
    & node --check (Join-Path $extensionDirectory $scriptName)
    if ($LASTEXITCODE -ne 0) { throw "構文確認失敗: $scriptName" }
}

$manifest = Get-Content -LiteralPath (Join-Path $extensionDirectory 'manifest.json') -Raw | ConvertFrom-Json
if ($manifest.manifest_version -ne 3 -or -not $manifest.version) { throw 'manifestが不正です' }
foreach ($entry in $manifest.content_scripts) {
    foreach ($scriptName in $entry.js) {
        if (-not (Test-Path -LiteralPath (Join-Path $extensionDirectory $scriptName))) { throw "manifest参照先なし: $scriptName" }
    }
}

$testFiles = @(Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.test.js' -File | ForEach-Object { $_.FullName })
if ($testFiles.Count -eq 0) { throw '自動試験がありません' }
& node --test @testFiles
if ($LASTEXITCODE -ne 0) { throw '回帰テスト失敗' }
Write-Output "自動チェック成功（版 $($manifest.version)）。Brave実機ケースは別途確認してください。"

param(
    [switch]$Upload,
    [switch]$PushPreview,
    [string]$Version,
    [string]$Description = '居民养老单页输入，默认按历史缴费估算',
    [string]$DevTools = 'D:\devTools\wechat_devtools',
    [string]$NodePath = (Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe')
)
$ErrorActionPreference = 'Stop'
$projectDir = Split-Path $PSScriptRoot -Parent
$nodeExe = $NodePath
if (-not (Test-Path -LiteralPath $nodeExe)) { $nodeExe = (Get-Command node -ErrorAction Stop).Source }
$compilerDir = Join-Path $DevTools 'code\package.nw\node_modules\wcc-exec'
$buildDir = Join-Path $projectDir 'output'
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null
if (-not $Version) {
    $Version = (Get-Content -LiteralPath (Join-Path $projectDir 'package.json') -Raw | ConvertFrom-Json).version
}
Push-Location $projectDir
try {
    & $nodeExe --test 'tests/*.test.js'
    if ($LASTEXITCODE -ne 0) { throw '测试失败，停止编译及上传。' }
    $templates = @(Get-ChildItem miniprogram -Recurse -Filter '*.wxml' | ForEach-Object { $_.FullName.Replace($projectDir + '\', '').Replace('\', '/') })
    & (Join-Path $compilerDir 'wcc.exe') -o (Join-Path $buildDir 'wxml-checked.js') @templates
    if ($LASTEXITCODE -ne 0) { throw 'WXML编译失败，停止上传。' }
    $styles = @(Get-ChildItem miniprogram -Recurse -Filter '*.wxss' | ForEach-Object { $_.FullName.Replace($projectDir + '\', '').Replace('\', '/') })
    & (Join-Path $compilerDir 'wcsc.exe') -o (Join-Path $buildDir 'wxss-checked.js') @styles
    if ($LASTEXITCODE -ne 0) { throw 'WXSS编译失败，停止上传。' }
    $buildTime = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $record = [ordered]@{ version = $Version; checkedAt = $buildTime; uploaded = $false }
    if ($Upload) {
        # Requires an IDE login and the user-enabled service port. Never changes security settings.
        & (Join-Path $DevTools 'cli.bat') upload --project $projectDir --version $Version --desc "$Description；构建 $buildTime" --info-output (Join-Path $buildDir 'upload-latest.json')
        if ($LASTEXITCODE -ne 0) { throw '开发版上传失败。请检查开发者工具登录、服务端口及终端输出。' }
        $record.uploaded = $true
    }
    $record | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $buildDir 'build-latest.json') -Encoding utf8
    if ($Upload) { Write-Output "开发版上传完成：$Version，$buildTime；未送审或发布。" }
    else { Write-Output "检查和模板样式编译完成：$Version；尚未上传。" }
    if ($PushPreview) {
        & (Join-Path $DevTools 'cli.bat') auto-preview --project $projectDir --info-output (Join-Path $buildDir 'auto-preview-latest.json')
        if ($LASTEXITCODE -ne 0) { throw '自动预览推送失败，不能确认手机已打开新版；如已上传，上传结果仍见build-latest.json。' }
        Write-Output '自动预览命令成功；手机实际打开状态仍需在手机上确认。'
    }
}
finally { Pop-Location }

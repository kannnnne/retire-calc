param([string]$Repository = 'D:\project\retire-calc')
$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path $PSScriptRoot -Parent
$repoRoot = (Resolve-Path -LiteralPath $Repository).Path
if (-not (Test-Path -LiteralPath (Join-Path $repoRoot '.git'))) { throw '目标必须是现有 Git 仓库。' }
$destinationRoot = Join-Path $repoRoot 'miniapp'
if ([IO.Path]::GetFullPath($sourceRoot).TrimEnd('\') -eq [IO.Path]::GetFullPath($destinationRoot).TrimEnd('\')) {
    Write-Output '当前已经位于仓库 miniapp 目录，无需同步。'
    return
}
$files = @('README.md', 'AGENTS.md', '.gitignore', 'package.json', 'project.config.json')
foreach ($folder in @('miniprogram', 'scripts', 'tests')) {
    $files += Get-ChildItem -LiteralPath (Join-Path $sourceRoot $folder) -File -Recurse | ForEach-Object { [IO.Path]::GetRelativePath($sourceRoot, $_.FullName) }
}
$files += Get-ChildItem -LiteralPath (Join-Path $sourceRoot 'docs') -Filter '*.md' -File | ForEach-Object { [IO.Path]::GetRelativePath($sourceRoot, $_.FullName) }
$files += 'docs\default-makeup-coverage.csv'
$files += 'branding\avatar-v1.png'
$files += @('branding\avatar-v2-blue-abacus.png', 'branding\identity.md')
foreach ($relative in $files) {
    $destination = Join-Path $destinationRoot $relative
    New-Item -ItemType Directory -Force -Path (Split-Path $destination -Parent) | Out-Null
    Copy-Item -LiteralPath (Join-Path $sourceRoot $relative) -Destination $destination -Force
}
Write-Output "已同步 $($files.Count) 个相关文件到 $destinationRoot；不包含 output、私有配置、后台页面和日志。"
Write-Output '如删除了源文件，请检查并移除仓库中的对应旧文件；此脚本不自动删除文件。'

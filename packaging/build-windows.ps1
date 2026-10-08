param([string]$Version = '0.2.0')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    # Close running development JARs/EXEs before rebuilding on Windows.
    & mvn clean package
    if ($LASTEXITCODE -ne 0) { throw 'Maven build failed. Close the running application before retrying.' }
    $buildStamp=Get-Date -Format 'yyyyMMdd-HHmmss'
    $stage=Join-Path $PSScriptRoot "staging\$buildStamp"
    $destination=Join-Path $projectRoot "dist\build-$buildStamp"
    New-Item -ItemType Directory -Force $stage,$destination | Out-Null
    Copy-Item -LiteralPath (Join-Path $projectRoot 'target\retire-calc-0.1.0.jar') -Destination (Join-Path $stage 'retire-calc.jar')
    & jpackage --type app-image --name RetireCalc --app-version $Version --vendor RetireCalc --input $stage --main-jar retire-calc.jar --main-class org.springframework.boot.loader.launch.JarLauncher --arguments --desktop --dest $destination --add-modules java.se,jdk.unsupported,jdk.crypto.ec
    if ($LASTEXITCODE -ne 0) { throw 'jpackage failed. Use a Windows JDK 21 with jpackage available.' }
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot '便携版使用说明.txt') -Destination (Join-Path $destination 'RetireCalc\使用说明.txt')
    $archive=Join-Path $destination "Guangzhou-RetireCalc-$Version-win-x64.zip"
    Compress-Archive -LiteralPath (Join-Path $destination 'RetireCalc') -DestinationPath $archive -CompressionLevel Optimal
    Write-Output "Portable package: $archive"
} finally { Pop-Location }

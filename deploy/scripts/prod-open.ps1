# 在默认浏览器中打开生产环境
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_config.ps1')

Assert-ProdInitialized

$bindHost = Get-ProdEnv 'BIND_HOST' '127.0.0.1'
$bindPort = Get-ProdEnv 'BIND_PORT' '33510'
$url = "http://localhost:$bindPort"
if ($bindHost -ne '127.0.0.1' -and $bindHost -ne 'localhost') {
    $url = "http://$bindHost`:$bindPort"
}

Write-Step "打开 $url"
Start-Process $url

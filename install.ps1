#!/usr/bin/env pwsh
# Based on https://github.com/denoland/deno_install/blob/master/install.ps1

$ErrorActionPreference = 'Stop'

if ($v) {
  $Version = "v${v}"
}
if ($args.Length -eq 1) {
  $Version = $args.Get(0)
}

$BinDir = "$Home\.n\bin"

$NZip = "$BinDir\n.zip"
$NExe = "$BinDir\n.exe"

# GitHub requires TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$NUri = if (!$Version) {
  "https://github.com/nbuilding/N-lang/releases/latest/download/N.zip"
} else {
  "https://github.com/nbuilding/N-lang/releases/download/${Version}/N.zip"
}

if (!(Test-Path $BinDir)) {
  New-Item $BinDir -ItemType Directory | Out-Null
}

Invoke-WebRequest $NUri -OutFile $NZip -UseBasicParsing

if (Get-Command Expand-Archive -ErrorAction SilentlyContinue) {
  Expand-Archive $NZip -Destination $BinDir -Force
} else {
  if (Test-Path $NExe) {
    Remove-Item $NExe
  }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::ExtractToDirectory($NZip, $BinDir)
}

Remove-Item $NZip

$User = [EnvironmentVariableTarget]::User
$Path = [Environment]::GetEnvironmentVariable('Path', $User)
if (!(";$Path;".ToLower() -like "*;$BinDir;*".ToLower())) {
  [Environment]::SetEnvironmentVariable('Path', "$Path;$BinDir", $User)
  $Env:Path += ";$BinDir"
}

Write-Output "N was installed successfully to $NExe"
Write-Output "Run 'n --help' to get started"

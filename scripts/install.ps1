# Install the jtype CLI on Windows (x64).
#   irm https://raw.githubusercontent.com/cnjack/jtype/main/scripts/install.ps1 | iex
$ErrorActionPreference = 'Stop'

$repo  = 'cnjack/jtype'
$asset = 'jtype-windows-x64.exe'
$dir   = Join-Path $env:LOCALAPPDATA 'jtype\bin'
$exe   = Join-Path $dir 'jtype.exe'
$url   = "https://github.com/$repo/releases/latest/download/$asset"

New-Item -ItemType Directory -Force -Path $dir | Out-Null
Write-Host "Downloading $asset ..."
Invoke-WebRequest -Uri $url -OutFile $exe -UseBasicParsing

# Add the install dir to the user PATH (idempotent).
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not ($userPath -split ';' | Where-Object { $_.Trim() -ieq $dir })) {
  $newPath = if ([string]::IsNullOrWhiteSpace($userPath)) { $dir } else { "$($userPath.TrimEnd(';'));$dir" }
  [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
}

Write-Host "OK Installed jtype to $exe"
Write-Host "  Open a new terminal, then run: jtype login"

# Runs a Blender script headless and waits for it to finish.
#   powershell -File blender/render.ps1 [-Script hero.py] [-Name hero] [-TimeoutMin 60]
# Settings are passed as environment variables (HERO_W, HERO_H, HERO_SPP, ...).
# The Microsoft Store build of Blender can only be started through its launcher,
# which detaches, so the script signals completion with a ".done" file.
param(
  [string]$Script = "hero.py",
  [string]$Name = "hero",
  [int]$TimeoutMin = 60
)
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $here "out"
New-Item -ItemType Directory -Force $out | Out-Null
$done = Join-Path $out "$Name.done"
$log = Join-Path $out "$Name.log"
Remove-Item $done, $log -ErrorAction SilentlyContinue
$env:HERO_NAME = $Name

$blender = (Get-Command blender -ErrorAction SilentlyContinue).Source
if (-not $blender) { $blender = Join-Path $env:LOCALAPPDATA "Microsoft\WindowsApps\blender-launcher.exe" }
if (-not (Test-Path $blender)) { Write-Output "Blender not found"; exit 1 }

Start-Process -FilePath $blender -ArgumentList @("-b", "-P", "`"$(Join-Path $here $Script)`"") | Out-Null
$deadline = (Get-Date).AddMinutes($TimeoutMin)
while (-not (Test-Path $done)) {
  if ((Get-Date) -gt $deadline) { Write-Output "timed out after $TimeoutMin min"; if (Test-Path $log) { Get-Content $log -Tail 20 }; exit 2 }
  Start-Sleep -Seconds 3
}
Write-Output "status: $(Get-Content $done)"
if (Test-Path $log) { Get-Content $log -Tail 40 }

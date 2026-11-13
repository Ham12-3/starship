# Renders the three space shots in a row (hot staging, onboard, satellite deploy).
#   powershell -File blender/render-space.ps1
param([string[]]$Only = @())
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$jobs = @(
  @{ name = "staging"; shot = "staging"; seq = "-1.0,6.0,28"; start = "0"; flame = "30"; exposure = "0" },
  @{ name = "staging"; shot = "onboard"; seq = "1.0,10.0,18"; start = "28"; flame = "1.5"; exposure = "-0.6" },
  @{ name = "deploy"; shot = "deploy"; seq = "0.0,9.5,30"; start = "0"; flame = "30"; exposure = "0" }
)
foreach ($j in $jobs) {
  if ($Only.Count -and -not ($Only -contains $j.shot)) { continue }
  Get-ChildItem Env:HERO_* | ForEach-Object { Remove-Item "Env:$($_.Name)" }
  $env:HERO_SCENE = "space"; $env:HERO_W = "1280"; $env:HERO_H = "720"; $env:HERO_SPP = "20"
  $env:HERO_SHOT = $j.shot; $env:HERO_SEQ = $j.seq; $env:HERO_SEQ_START = $j.start
  $env:HERO_FLAME = $j.flame; $env:HERO_EXPOSURE = $j.exposure
  & (Join-Path $here "render.ps1") -Name $j.name -TimeoutMin 120 | Select-Object -Last 2
}

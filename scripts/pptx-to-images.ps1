# Export every slide of a .pptx to crisp JPG images via PowerPoint COM.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\pptx-to-images.ps1
# Re-run whenever the deck changes; output feeds the landing-page slideshow.
$ErrorActionPreference = 'Stop'

$src = 'C:\Users\esantos\projeto-pessoal\EdEspetoHub\The_Zero_Commission_Sales_Ecosystem.pptx'
$out = 'C:\Users\esantos\projeto-pessoal\EdEspetoHub\frontend\public\deck'

if (-not (Test-Path $src)) { throw "PPTX não encontrado: $src" }
New-Item -ItemType Directory -Force -Path $out | Out-Null
Get-ChildItem $out -Filter 'slide-*.jpg' -ErrorAction SilentlyContinue | Remove-Item -Force

$targetWidth = 2400   # px — crisp on retina, still web-friendly (~300-800 KB/slide JPG)

$ppt = New-Object -ComObject PowerPoint.Application
try {
    $pres  = $ppt.Presentations.Open($src, $true, $false, $false)  # ReadOnly, Untitled=no, WithWindow=no
    $sw    = $pres.PageSetup.SlideWidth
    $sh    = $pres.PageSetup.SlideHeight
    $ratio = $sw / $sh
    $w     = $targetWidth
    $h     = [int][Math]::Round($w / $ratio)
    Write-Host ("Slide size: {0:N0} x {1:N0} pts (aspect {2:N3}) -> exporting {3}x{4} JPG" -f $sw, $sh, $ratio, $w, $h)

    foreach ($s in $pres.Slides) {
        $n    = '{0:D2}' -f $s.SlideIndex
        $path = Join-Path $out "slide-$n.jpg"
        $s.Export($path, 'JPG', $w, $h)
    }
    $count = $pres.Slides.Count
    $pres.Close()
    Write-Host "Exported $count slides -> $out"
}
finally {
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
    [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}

Get-ChildItem $out -Filter 'slide-*.jpg' | Sort-Object Name | ForEach-Object {
    Write-Host ("  {0}  {1:N0} KB" -f $_.Name, ($_.Length / 1KB))
}

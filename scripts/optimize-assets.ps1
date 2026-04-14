$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

function Save-BitmapPng {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$Path
  )

  $directory = (Resolve-Path (Split-Path $Path -Parent)).Path
  $tempPath = Join-Path $directory ([System.IO.Path]::GetRandomFileName() + '.png')

  try {
    $Bitmap.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
    [System.IO.File]::Copy($tempPath, $Path, $true)
  } finally {
    if (Test-Path $tempPath) {
      Remove-Item -Force $tempPath
    }
  }
}

function Resize-PngFile {
  param(
    [string]$Path,
    [int]$Width,
    [int]$Height
  )

  $resolved = (Resolve-Path $Path).Path
  $bytes = [System.IO.File]::ReadAllBytes($resolved)
  $stream = New-Object System.IO.MemoryStream(, $bytes)
  $src = [System.Drawing.Image]::FromStream($stream)

  try {
    $bmp = New-Object System.Drawing.Bitmap $Width, $Height

    try {
      $bmp.SetResolution($src.HorizontalResolution, $src.VerticalResolution)
      $graphics = [System.Drawing.Graphics]::FromImage($bmp)

      try {
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.DrawImage($src, 0, 0, $Width, $Height)
      } finally {
        $graphics.Dispose()
      }

      Save-BitmapPng -Bitmap $bmp -Path $Path
    } finally {
      $bmp.Dispose()
    }
  } finally {
    $src.Dispose()
    $stream.Dispose()
  }
}

function Resize-PngMax {
  param(
    [string]$Path,
    [int]$MaxDimension
  )

  $resolved = (Resolve-Path $Path).Path
  $bytes = [System.IO.File]::ReadAllBytes($resolved)
  $stream = New-Object System.IO.MemoryStream(, $bytes)
  $src = [System.Drawing.Image]::FromStream($stream)

  try {
    $maxCurrent = [Math]::Max($src.Width, $src.Height)
    if ($maxCurrent -le $MaxDimension) {
      return
    }

    $scale = $MaxDimension / $maxCurrent
    $newWidth = [Math]::Max(1, [int][Math]::Round($src.Width * $scale))
    $newHeight = [Math]::Max(1, [int][Math]::Round($src.Height * $scale))
  } finally {
    $src.Dispose()
    $stream.Dispose()
  }

  Resize-PngFile -Path $Path -Width $newWidth -Height $newHeight
}

$launcherSizes = @{
  'mobile/android/app/src/main/res/mipmap-mdpi/ic_launcher.png' = 48
  'mobile/android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png' = 48
  'mobile/android/app/src/main/res/mipmap-hdpi/ic_launcher.png' = 72
  'mobile/android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png' = 72
  'mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png' = 96
  'mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png' = 96
  'mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png' = 144
  'mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png' = 144
  'mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png' = 192
  'mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png' = 192
}

foreach ($entry in $launcherSizes.GetEnumerator()) {
  Resize-PngFile -Path $entry.Key -Width $entry.Value -Height $entry.Value
}

$maxResize = @{
  'frontend/public/jnc.png' = 1024
  'frontend/public/marketing/promo-beleza.png' = 1600
  'frontend/public/marketing/promo-termica.png' = 900
  'frontend/public/marketing/arquitetura-jano-caminho.png' = 1280
  'frontend/public/marketing/item-modal.png' = 1600
  'frontend/public/marketing/promo-adega.png' = 1280
  'mobile/android/app/src/main/assets/public/jnc.png' = 1024
  'mobile/android/app/src/main/assets/public/marketing/promo-beleza.png' = 1600
  'mobile/android/app/src/main/assets/public/marketing/promo-termica.png' = 900
  'mobile/android/app/src/main/assets/public/marketing/arquitetura-jano-caminho.png' = 1280
  'mobile/android/app/src/main/assets/public/marketing/item-modal.png' = 1600
  'mobile/android/app/src/main/assets/public/marketing/promo-adega.png' = 1280
}

foreach ($entry in $maxResize.GetEnumerator()) {
  Resize-PngMax -Path $entry.Key -MaxDimension $entry.Value
}

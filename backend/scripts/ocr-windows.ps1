# Elune OCR helper (Windows only, no extra dependencies).
# Renders PDF pages with the built-in Windows.Data.Pdf API and reads them with
# the built-in Windows.Media.Ocr engine. Emits one JSON object per line:
#   {"page":N,"text":"...","lines":K}        for each page
#   {"done":true,"pages":TOTAL,"language":"en-US"}  at the end
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File ocr-windows.ps1 -Pdf <path> [-From 1] [-To N] [-Width 1700]
param(
  [Parameter(Mandatory = $true)][string]$Pdf,
  [int]$From = 1,
  [int]$To = 0,
  [int]$Width = 1700
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime]
$null = [Windows.Data.Pdf.PdfPageRenderOptions, Windows.Data.Pdf, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]

$asTaskOp = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
$asTaskAction = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' })[0]
function Await($op, [Type]$t) { $task = $asTaskOp.MakeGenericMethod($t).Invoke($null, @($op)); if (-not $task.Wait(60000)) { throw "timeout waiting for $($t.Name)" }; $task.Result }
function AwaitAction($action) { $task = $asTaskAction.Invoke($null, @($action)); if (-not $task.Wait(60000)) { throw "timeout waiting for action" } }

$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync((Resolve-Path $Pdf).Path)) ([Windows.Storage.StorageFile])
$doc = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
$total = [int]$doc.PageCount
if ($To -le 0 -or $To -gt $total) { $To = $total }
if ($From -lt 1) { $From = 1 }

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($null -eq $engine) { $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('en-US')) }
if ($null -eq $engine) { Write-Output (@{ error = 'NO_OCR_ENGINE' } | ConvertTo-Json -Compress); exit 2 }

for ($p = $From; $p -le $To; $p++) {
  try {
    $page = $doc.GetPage([uint32]($p - 1))
    $stream = [Windows.Storage.Streams.InMemoryRandomAccessStream]::new()
    $opts = [Windows.Data.Pdf.PdfPageRenderOptions]::new()
    $opts.DestinationWidth = [uint32][Math]::Min($Width, [Windows.Media.Ocr.OcrEngine]::MaxImageDimension)
    AwaitAction ($page.RenderToStreamAsync($stream, $opts))
    $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
    $text = (($result.Lines | ForEach-Object { $_.Text }) -join "`n")
    Write-Output (@{ page = $p; text = $text; lines = @($result.Lines).Count } | ConvertTo-Json -Compress)
    $bitmap.Dispose(); $stream.Dispose(); $page.Dispose()
  } catch {
    Write-Output (@{ page = $p; text = ''; lines = 0; error = $_.Exception.Message } | ConvertTo-Json -Compress)
  }
}
Write-Output (@{ done = $true; pages = $total; language = $engine.RecognizerLanguage.LanguageTag } | ConvertTo-Json -Compress)
[Console]::Out.Flush()
# WinRT objects can keep the PowerShell host alive after the script ends; exit explicitly.
[Environment]::Exit(0)

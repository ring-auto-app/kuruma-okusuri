# Mirrors refresh-owner-release.mjs (Node-free)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$version = '20261120-v54'
$cacheName = 'car-nappy-v55'
$revised = @(
  'app.js', 'common.css', 'vin-search.js', 'staff_admin.js', 'gemini-ocr.js',
  'rental-fleet.js', 'rental-fleet.css', 'fleet-check-sheet.js', 'fleet-check-sheet.css',
  'fleet-check-sheet-pdf.js', 'owner-platform.js', 'owner-platform-ui.js', 'vendor/qr/qrcode.js'
) | ForEach-Object { $_ }

function Get-DigestsHex($relativePath) {
  $full = Join-Path $root $relativePath
  $bytes = [IO.File]::ReadAllBytes($full)
  $utf8 = [Text.Encoding]::UTF8.GetString($bytes)
  $lf = ($utf8 -replace "`r`n", "`n")
  $crlf = ($lf -replace "`n", "`r`n")
  $hashes = [System.Collections.Generic.HashSet[string]]::new()
  foreach ($s in @($lf, $crlf)) {
    $sha = [Security.Cryptography.SHA256]::Create()
  $hb = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($s))
    [void]$hashes.Add(([BitConverter]::ToString($hb) -replace '-', '').ToLower())
    $sha.Dispose()
  }
  $shaB = [Security.Cryptography.SHA256]::Create()
  $hbB = $shaB.ComputeHash($bytes)
  $rawH = ([BitConverter]::ToString($hbB) -replace '-', '').ToLower()
  $shaB.Dispose()
  if (-not $hashes.Contains($rawH)) { throw "Mixed line endings or non-UTF8: $relativePath" }
  return @($hashes) | Sort-Object
}

function Get-DigestsBase64($relativePath) {
  $full = Join-Path $root $relativePath
  $bytes = [IO.File]::ReadAllBytes($full)
  $utf8 = [Text.Encoding]::UTF8.GetString($bytes)
  $lf = ($utf8 -replace "`r`n", "`n")
  $crlf = ($lf -replace "`n", "`r`n")
  $out = [System.Collections.Generic.List[string]]::new()
  foreach ($s in @($lf, $crlf)) {
    $sha = [Security.Cryptography.SHA256]::Create()
    $hb = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($s))
    $out.Add([Convert]::ToBase64String($hb))
    $sha.Dispose()
  }
  return ($out | Select-Object -Unique)
}

$urls = [System.Collections.Generic.HashSet[string]]::new()
$htmlFiles = Get-ChildItem -Path $root -Filter '*.html' -File | Select-Object -ExpandProperty Name
foreach ($name in $htmlFiles) {
  $path = Join-Path $root $name
  $html = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
  $newHtml = [regex]::Replace($html, '<(script|link)\b[^>]*>', {
    param($m)
    $tag = $m.Value
    if ($tag -notmatch '\b(src|href)="([^"?]+)') { return $tag }
    $attr = $Matches[1]
    $asset = $Matches[2]
    if ($revised -notcontains $asset) { return $tag }
    $sums = (Get-DigestsBase64 $asset) | ForEach-Object { "sha256-$_" }
    [void]$urls.Add('./' + $asset)
    [void]$urls.Add("./$asset?v=$version")
    $tag = [regex]::Replace($tag, '\s+integrity="[^"]*"', '')
    $tag = [regex]::Replace($tag, "\b$attr=`"$([regex]::Escape($asset))(?:\?[^`"]*)?`"", "$attr=`"$asset?v=$version`" integrity=`"$($sums -join ' ')`"")
    return $tag
  })
  if ($newHtml -ne $html) { [IO.File]::WriteAllText($path, $newHtml, (New-Object Text.UTF8Encoding $false)) }
}

$swPath = Join-Path $root 'service-worker.js'
$worker = [IO.File]::ReadAllText($swPath, [Text.Encoding]::UTF8)
$entryMatch = [regex]::Match($worker, 'const PRECACHE_URLS = (\[[\s\S]*?\]);')
$hashMatch = [regex]::Match($worker, 'const RELEASE_SHA256 = (\{[\s\S]*?\});')
if (-not $entryMatch.Success -or -not $hashMatch.Success) { throw 'service-worker parse failed' }
$previous = $entryMatch.Groups[1].Value | ConvertFrom-Json
$list = [System.Collections.Generic.List[string]]::new()
foreach ($u in $previous) {
  if ($u -match '\?' -and $revised -contains ($u.Substring(2) -split '\?')[0]) { continue }
  $list.Add($u)
}
foreach ($u in $urls) { if (-not $list.Contains($u)) { $list.Add($u) } }
foreach ($f in $htmlFiles) {
  $u = './' + $f
  if (-not $list.Contains($u)) { $list.Add($u) }
}

$manifest = $hashMatch.Groups[1].Value | ConvertFrom-Json
$manifestObj = @{}
$manifest.PSObject.Properties | ForEach-Object { $manifestObj[$_.Name] = @($_.Value) }
foreach ($u in $list) {
  $key = ($u -split '\?')[0]
  if ($key -match '\.(css|js|html|mjs)$') {
    $rel = $key.Substring(2)
    if (Test-Path (Join-Path $root $rel)) {
      $manifestObj[$key] = @(Get-DigestsHex $rel)
    }
  }
}

$jsonList = ($list | ConvertTo-Json -Compress)
$jsonList = $jsonList -replace '^\[', "[`n  " -replace '\]', "`n]" -replace '","', '",`n  "' -replace '^', '' 
# pretty print like node
$prettyList = "const PRECACHE_URLS = [" + ($list | ForEach-Object { "`n  `"$_`"" }) -join '' + "`n];"

$manifestPairs = ($manifestObj.GetEnumerator() | Sort-Object Name | ForEach-Object {
  $vals = ($_.Value | ForEach-Object { "`"$_`"" }) -join ', '
  "  `"$($_.Key)`": [`n    $vals`n  ]"
}) -join ",`n"
$prettyManifest = "const RELEASE_SHA256 = {`n$manifestPairs`n};"

$worker = [regex]::Replace($worker, 'const CACHE_NAME = "car-nappy-v\d+";', "const CACHE_NAME = `"$cacheName`";")
$worker = [regex]::Replace($worker, 'const PRECACHE_URLS = \[[\s\S]*?\];', $prettyList)
$worker = [regex]::Replace($worker, 'const RELEASE_SHA256 = \{[\s\S]*?\};', $prettyManifest)
[IO.File]::WriteAllText($swPath, $worker, (New-Object Text.UTF8Encoding $false))
Write-Host "Release $cacheName : $($list.Count) URLs, $($manifestObj.Count) content hashes"
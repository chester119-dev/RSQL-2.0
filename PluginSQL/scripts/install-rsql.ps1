param(
  [string]$RepositoryUrl = $env:RSQL_REPOSITORY_URL,
  [string]$InstallDir = "",
  [switch]$SkipPlugin,
  [switch]$StartAfterInstall,
  [switch]$Help
)

$ErrorActionPreference = "Stop"
$DefaultRepositoryUrl = "https://github.com/chester119-dev/RSQL-2.0.git"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$Message)
  Write-Host "OK  $Message" -ForegroundColor Green
}

function Get-DefaultInstallDir {
  if (-not $env:LOCALAPPDATA) {
    throw "LOCALAPPDATA was not found. This installer needs a Windows user profile folder."
  }

  return [System.IO.Path]::Combine($env:LOCALAPPDATA, "RSQL", "app")
}

function Get-LocalRepositoryRoot {
  $candidates = @()

  if ($PSScriptRoot) {
    $candidates += (Resolve-Path ([System.IO.Path]::Combine($PSScriptRoot, ".."))).Path
  }

  $candidates += (Get-Location).Path

  foreach ($candidate in $candidates) {
    if (
      (Test-Path -LiteralPath ([System.IO.Path]::Combine($candidate, "bridge", "package.json"))) -and
      (Test-Path -LiteralPath ([System.IO.Path]::Combine($candidate, "web", "package.json")))
    ) {
      return $candidate
    }
  }

  return $null
}

function Require-Command {
  param(
    [string]$Name,
    [string]$HelpMessage
  )

  $command = Get-Command $Name -ErrorAction SilentlyContinue

  if (-not $command) {
    throw "$Name was not found. $HelpMessage"
  }

  return $command.Source
}

function Invoke-External {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$WorkingDirectory = ""
  )

  if ($WorkingDirectory) {
    Push-Location $WorkingDirectory
  }

  try {
    & $FilePath @Arguments

    if ($LASTEXITCODE -ne 0) {
      throw "Command failed with exit code $LASTEXITCODE`: $FilePath $($Arguments -join ' ')"
    }
  } finally {
    if ($WorkingDirectory) {
      Pop-Location
    }
  }
}

function Sync-Repository {
  param(
    [string]$Url,
    [string]$TargetDir
  )

  $git = Require-Command "git" "Install Git for Windows and try again."
  $parent = Split-Path -Parent $TargetDir

  if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }

  if (Test-Path -LiteralPath $TargetDir) {
    $hasGit = Test-Path -LiteralPath ([System.IO.Path]::Combine($TargetDir, ".git"))
    $hasFiles = @(Get-ChildItem -Force -LiteralPath $TargetDir | Select-Object -First 1).Count -gt 0

    if ($hasGit) {
      Write-Step "Updating repository"
      Invoke-External -FilePath $git -Arguments @("-C", $TargetDir, "pull", "--ff-only")
      return (Resolve-Path $TargetDir).Path
    }

    if ($hasFiles) {
      throw "InstallDir already exists and is not a Git repository: $TargetDir"
    }
  }

  Write-Step "Cloning repository"
  Invoke-External -FilePath $git -Arguments @("clone", $Url, $TargetDir)
  return (Resolve-Path $TargetDir).Path
}

function Install-NodeDependencies {
  param([string]$ProjectRoot)

  $npm = Get-Command "npm.cmd" -ErrorAction SilentlyContinue

  if (-not $npm) {
    $npm = Get-Command "npm" -ErrorAction SilentlyContinue
  }

  if (-not $npm) {
    throw "npm was not found. Install Node.js LTS and try again."
  }

  Require-Command "node" "Install Node.js LTS and try again." | Out-Null

  foreach ($folder in @("bridge", "web")) {
    $packageJson = [System.IO.Path]::Combine($ProjectRoot, $folder, "package.json")

    if (-not (Test-Path -LiteralPath $packageJson)) {
      throw "Missing package.json: $packageJson"
    }

    Write-Step "Installing $folder dependencies"
    Invoke-External -FilePath $npm.Source -Arguments @("install") -WorkingDirectory ([System.IO.Path]::Combine($ProjectRoot, $folder))
  }
}

function Install-RobloxPlugin {
  param([string]$ProjectRoot)

  if (-not $env:LOCALAPPDATA) {
    throw "LOCALAPPDATA was not found. Could not locate Roblox local plugins folder."
  }

  $pluginRoot = [System.IO.Path]::Combine($ProjectRoot, "roblox-plugin")
  $pluginSource = $null

  foreach ($fileName in @("RSQL.plugin.luau", "RSQL.plugin.lua")) {
    $candidate = [System.IO.Path]::Combine($pluginRoot, $fileName)

    if (Test-Path -LiteralPath $candidate) {
      $pluginSource = $candidate
      break
    }
  }

  if (-not $pluginSource) {
    throw "Could not find RSQL.plugin.luau or RSQL.plugin.lua in $pluginRoot"
  }

  $robloxPluginsDir = [System.IO.Path]::Combine($env:LOCALAPPDATA, "Roblox", "Plugins")

  if (-not (Test-Path -LiteralPath $robloxPluginsDir)) {
    New-Item -ItemType Directory -Force -Path $robloxPluginsDir | Out-Null
  }

  $pluginDestination = [System.IO.Path]::Combine($robloxPluginsDir, (Split-Path -Leaf $pluginSource))

  Copy-Item -LiteralPath $pluginSource -Destination $pluginDestination -Force
  Write-Ok "Roblox Studio plugin installed at $pluginDestination"
}

function Write-Launcher {
  param(
    [string]$ToolsDir,
    [string]$Name,
    [string]$Target
  )

  if (-not (Test-Path -LiteralPath $ToolsDir)) {
    New-Item -ItemType Directory -Force -Path $ToolsDir | Out-Null
  }

  $launcherPath = [System.IO.Path]::Combine($ToolsDir, $Name)
  $content = @"
@echo off
call "$Target" %*
"@

  Set-Content -LiteralPath $launcherPath -Value $content -Encoding ASCII
  return $launcherPath
}

function Show-Help {
  Write-Host "RSQL Windows installer"
  Write-Host ""
  Write-Host "Usage:"
  Write-Host "  install-rsql.cmd"
  Write-Host "  install-rsql.cmd -StartAfterInstall"
  Write-Host "  install-rsql.cmd -RepositoryUrl $DefaultRepositoryUrl"
  Write-Host ""
  Write-Host "Environment:"
  Write-Host "  RSQL_REPOSITORY_URL can provide the repository URL."
  Write-Host "  Default repository: $DefaultRepositoryUrl"
  Write-Host ""
  Write-Host "Default install dir:"
  Write-Host "  %LOCALAPPDATA%\RSQL\app"
}

if ($Help) {
  Show-Help
  exit 0
}

try {
  if (-not $InstallDir) {
    $InstallDir = Get-DefaultInstallDir
  }

  Write-Host "RSQL Installer" -ForegroundColor Cyan
  Write-Host "Install dir: $InstallDir"

  $localRoot = Get-LocalRepositoryRoot
  $projectRoot = $null

  if ($RepositoryUrl) {
    $projectRoot = Sync-Repository $RepositoryUrl $InstallDir
  } elseif ($localRoot) {
    $projectRoot = $localRoot
    Write-Ok "Using local repository at $projectRoot"
  } else {
    $RepositoryUrl = $DefaultRepositoryUrl
    Write-Ok "Using default repository $RepositoryUrl"
    $projectRoot = Sync-Repository $RepositoryUrl $InstallDir
  }

  Install-NodeDependencies $projectRoot

  if (-not $SkipPlugin) {
    Write-Step "Installing Roblox Studio plugin"
    Install-RobloxPlugin $projectRoot
  }

  $toolsDir = [System.IO.Path]::Combine($env:LOCALAPPDATA, "RSQL")
  $startScript = [System.IO.Path]::Combine($projectRoot, "start-rsql.cmd")
  $debugScript = [System.IO.Path]::Combine($projectRoot, "rsql-debug.cmd")

  if (Test-Path -LiteralPath $startScript) {
    $launcher = Write-Launcher $toolsDir "start-rsql.cmd" $startScript
    Write-Ok "Start launcher created at $launcher"
  }

  if (Test-Path -LiteralPath $debugScript) {
    $debugLauncher = Write-Launcher $toolsDir "rsql-debug.cmd" $debugScript
    Write-Ok "Debug launcher created at $debugLauncher"
  }

  Write-Host ""
  Write-Host "RSQL is installed." -ForegroundColor Green
  Write-Host "Start it with:"
  Write-Host "  $([System.IO.Path]::Combine($toolsDir, 'start-rsql.cmd'))"
  Write-Host ""
  Write-Host "Restart Roblox Studio if it was already open."

  if ($StartAfterInstall) {
    Write-Step "Starting RSQL"
    Start-Process -FilePath $startScript -WorkingDirectory $projectRoot
  }
} catch {
  Write-Host ""
  Write-Host "Install failed:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}

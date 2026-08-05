[CmdletBinding()]
param(
    [string]$EnvironmentFile = ".env.tunnel.local"
)

$ErrorActionPreference = "Stop"

function Fail([string]$Message) {
    Write-Error $Message
    exit 1
}

if (-not (Test-Path -LiteralPath $EnvironmentFile)) {
    Fail "Environment file not found: $EnvironmentFile. Copy .env.tunnel.example to a local ignored file first."
}

$values = @{}
Get-Content -LiteralPath $EnvironmentFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $parts = $line.Split("=", 2)
    if ($parts.Count -ne 2) { Fail "Malformed environment entry: $line" }
    $values[$parts[0].Trim()] = $parts[1].Trim()
}

$required = @(
    "OPENAI_API_KEY",
    "OPENAI_TUNNEL_ID",
    "AEOS_MCP_TRANSPORT",
    "AEOS_MCP_BIND_HOST",
    "AEOS_POLICY_VERSION",
    "AEOS_ALLOWED_TOOLS",
    "AEOS_RECEIPT_DIR"
)

foreach ($name in $required) {
    if (-not $values.ContainsKey($name) -or [string]::IsNullOrWhiteSpace($values[$name])) {
        Fail "Required configuration is missing: $name"
    }
}

if ($values["AEOS_MCP_BIND_HOST"] -notin @("127.0.0.1", "::1", "localhost")) {
    Fail "v0.1 must bind only to loopback. Received: $($values['AEOS_MCP_BIND_HOST'])"
}

if ($values["AEOS_MCP_TRANSPORT"] -notin @("http", "stdio")) {
    Fail "AEOS_MCP_TRANSPORT must be http or stdio."
}

if ($values["AEOS_MCP_TRANSPORT"] -eq "http") {
    if (-not $values.ContainsKey("AEOS_MCP_URL") -or [string]::IsNullOrWhiteSpace($values["AEOS_MCP_URL"])) {
        Fail "AEOS_MCP_URL is required for HTTP transport."
    }

    try { $uri = [Uri]$values["AEOS_MCP_URL"] } catch { Fail "AEOS_MCP_URL is not a valid URI." }
    if ($uri.Scheme -ne "http") { Fail "v0.1 expects local HTTP between tunnel-client and the private gateway." }
    if ($uri.Host -notin @("127.0.0.1", "::1", "localhost")) {
        Fail "AEOS_MCP_URL must target loopback in v0.1."
    }
}

$allowedTools = $values["AEOS_ALLOWED_TOOLS"].Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
if ($allowedTools.Count -ne 1 -or $allowedTools[0] -ne "aeos.system.health") {
    Fail "v0.1 permits exactly one tool: aeos.system.health"
}

if ($values["AEOS_POLICY_VERSION"] -ne "aeos-tunnel-policy-v0.1") {
    Fail "Policy version must be aeos-tunnel-policy-v0.1 for this scaffold."
}

if ($values["OPENAI_API_KEY"] -match "your_|example|placeholder") {
    Fail "OPENAI_API_KEY appears to contain a placeholder."
}

if ($values["OPENAI_TUNNEL_ID"] -match "your_|example|placeholder") {
    Fail "OPENAI_TUNNEL_ID appears to contain a placeholder."
}

Write-Host "ALLOW: tunnel configuration passed v0.1 validation."
Write-Host "Bind host: $($values['AEOS_MCP_BIND_HOST'])"
Write-Host "Transport: $($values['AEOS_MCP_TRANSPORT'])"
Write-Host "Policy: $($values['AEOS_POLICY_VERSION'])"
Write-Host "Allowed tool: aeos.system.health"
Write-Host "Secrets were checked for presence only and were not printed."

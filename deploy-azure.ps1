<#
.SYNOPSIS
    Deploys MyNaukri (PostgreSQL + .NET 10 API + React Frontend) to Azure in Central India on a Standard_B1s server.
#>

param (
    [string]$ResourceGroupName = "rg-mynaukri-centralindia",
    [string]$Location = "centralindia",
    [string]$VmName = "vm-mynaukri",
    [string]$VmSize = "Standard_B1s",
    [string]$DnsName = "mynaukri-edukey-$((Get-Random -Minimum 1000 -Maximum 9999))",
    [string]$AdminUsername = "azureuser"
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " MyNaukri Deployment to Azure ($Location) " -ForegroundColor Cyan
Write-Host " Target VM Size: $VmSize (1 vCPU, 1 GB RAM)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Verify Azure CLI Login
Write-Host "`n[1/6] Verifying Azure Account..." -ForegroundColor Yellow
$accountJson = az account show 2>$null
if (-not $accountJson) {
    Write-Host "Not signed in to Azure CLI. Please sign in..." -ForegroundColor Red
    az login
    $accountJson = az account show
}

$account = $accountJson | ConvertFrom-Json
Write-Host "Connected as: $($account.user.name)" -ForegroundColor Green
Write-Host "Subscription: $($account.name) ($($account.id))" -ForegroundColor Green

# 2. Create Resource Group
Write-Host "`n[2/6] Ensuring Resource Group '$ResourceGroupName' in $Location..." -ForegroundColor Yellow
az group create --name $ResourceGroupName --location $Location --output none
Write-Host "Resource Group ready." -ForegroundColor Green

# 3. Create Network Security Group
Write-Host "`n[3/6] Setting up Network Security Group and Inbound Rules..." -ForegroundColor Yellow
$nsgName = "nsg-$VmName"
az network nsg create --resource-group $ResourceGroupName --name $nsgName --location $Location --output none

# Add Rules: HTTP, HTTPS, SSH, API
$rules = @(
    @{ Name = "Allow-HTTP"; Priority = 100; Port = 80 },
    @{ Name = "Allow-HTTPS"; Priority = 110; Port = 443 },
    @{ Name = "Allow-SSH"; Priority = 120; Port = 22 },
    @{ Name = "Allow-API"; Priority = 130; Port = 8080 }
)

foreach ($rule in $rules) {
    az network nsg rule create `
        --resource-group $ResourceGroupName `
        --nsg-name $nsgName `
        --name $rule.Name `
        --priority $rule.Priority `
        --destination-port-ranges $rule.Port `
        --protocol Tcp `
        --access Allow `
        --direction Inbound `
        --output none
}
Write-Host "Security rules configured (Ports 22, 80, 443, 8080 open)." -ForegroundColor Green

# 4. Create Public IP with DNS
Write-Host "`n[4/6] Creating Public IP with DNS label '$DnsName'..." -ForegroundColor Yellow
$pipName = "pip-$VmName"
az network public-ip create `
    --resource-group $ResourceGroupName `
    --name $pipName `
    --location $Location `
    --allocation-method Static `
    --sku Standard `
    --dns-name $DnsName `
    --output none

$fqdn = az network public-ip show --resource-group $ResourceGroupName --name $pipName --query "dnsSettings.fqdn" -o tsv
$ipAddress = az network public-ip show --resource-group $ResourceGroupName --name $pipName --query "ipAddress" -o tsv
Write-Host "Public IP: $ipAddress" -ForegroundColor Green
Write-Host "FQDN: http://$fqdn" -ForegroundColor Green

# 5. Create Virtual Machine with Cloud-Init
Write-Host "`n[5/6] Provisioning Ubuntu 24.04 VM ($VmSize)..." -ForegroundColor Yellow
$cloudInitPath = Join-Path $PSScriptRoot "cloud-init.txt"

az vm create `
    --resource-group $ResourceGroupName `
    --name $VmName `
    --location $Location `
    --image "Canonical:ubuntu-24_04-lts:server:latest" `
    --size $VmSize `
    --admin-username $AdminUsername `
    --generate-ssh-keys `
    --public-ip-address $pipName `
    --nsg $nsgName `
    --custom-data $cloudInitPath `
    --os-disk-size-gb 30 `
    --storage-sku StandardSSD_LRS `
    --output none

Write-Host "VM '$VmName' provisioned successfully." -ForegroundColor Green

# 6. Deployment Status
Write-Host "`n[6/6] Cloud-Init Bootstrapping In Progress..." -ForegroundColor Yellow
Write-Host "The server is currently initializing:" -ForegroundColor Cyan
Write-Host "  - Configuring 2GB Swap space (protecting memory)" -ForegroundColor Gray
Write-Host "  - Installing Docker & Docker Compose" -ForegroundColor Gray
Write-Host "  - Cloning MyNaukri and starting containers" -ForegroundColor Gray
Write-Host "`nAccess your application once initialized at:" -ForegroundColor Green
Write-Host "  Website: http://$fqdn" -ForegroundColor Cyan
Write-Host "  IP:      http://$ipAddress" -ForegroundColor Cyan
Write-Host "  API:     http://$fqdn/api" -ForegroundColor Cyan
Write-Host "`nTo check deployment logs on the VM:" -ForegroundColor Yellow
Write-Host "  az vm run-command invoke --resource-group $ResourceGroupName --name $VmName --command-id RunShellScript --scripts 'cat /var/log/cloud-init-output.log'" -ForegroundColor Gray
Write-Host "==================================================" -ForegroundColor Cyan

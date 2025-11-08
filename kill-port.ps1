# PowerShell script to kill process on port 5000
$port = 5000
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Write-Host "Killing process $process on port $port"
    Stop-Process -Id $process -Force
    Write-Host "Process killed successfully"
} else {
    Write-Host "No process found on port $port"
}


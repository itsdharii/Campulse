# Starts the Campulse backend (port 8000) and frontend (port 5173) in two windows.
$root = $PSScriptRoot
if (-not (Test-Path "$root\.env")) { Copy-Item "$root\.env.example" "$root\.env"; Write-Host "Created .env - add your GROQ_API_KEY to enable the AI assistant." }
if (-not (Test-Path "$root\frontend\node_modules")) { Push-Location "$root\frontend"; npm install; Pop-Location }
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root'; py -m uvicorn api:app --port 8000"
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root\frontend'; npm run dev"
Start-Process "http://127.0.0.1:5173"

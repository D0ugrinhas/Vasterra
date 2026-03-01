@echo off
setlocal ENABLEDELAYEDEXPANSION

cd /d "%~dp0"

echo [Vasterra] Verificando dependencias...
if not exist "node_modules" (
  echo [Vasterra] node_modules nao encontrado. Instalando com npm install...
  call npm install
  if errorlevel 1 (
    echo [Vasterra] Falha ao instalar dependencias.
    pause
    exit /b 1
  )
)

echo [Vasterra] Iniciando aplicacao...
start "" "http://localhost:4173"
call npm run dev -- --host 0.0.0.0 --port 4173

endlocal

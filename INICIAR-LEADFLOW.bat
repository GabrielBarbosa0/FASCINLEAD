@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js e npm nao foram encontrados neste computador.
  echo Instale o Node.js antes de iniciar o LeadFlow.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias do LeadFlow pela primeira vez...
  call npm install
  if errorlevel 1 (
    echo.
    echo Nao foi possivel instalar as dependencias.
    pause
    exit /b 1
  )
)

echo.
echo Iniciando o LeadFlow...
echo O navegador sera aberto automaticamente.
echo Para desligar, volte a esta janela e pressione Ctrl+C.
echo.

call npm start

if errorlevel 1 (
  echo.
  echo O LeadFlow foi encerrado com um erro.
  pause
)

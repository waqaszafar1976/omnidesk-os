@echo off
title "Omnidesk OS Launcher & Recovery Suite"
echo ====================================================================
echo         OMNIDESK OS - ENTERPRISE LAUNCHER ^& PORT RECOVERY
echo ====================================================================
echo.

:: 1. Check directories existence
if not exist "backend" (
    echo [ERROR] Backend folder not found! Please run this script in the root directory of Omnidesk OS.
    pause
    exit /b
)
if not exist "frontend" (
    echo [ERROR] Frontend folder not found! Please run this script in the root directory of Omnidesk OS.
    pause
    exit /b
)

:: 2. Terminate any active process holding port 3000 or 5000
echo [1/5] Scanning and recovering network ports 3000 ^& 5000...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr /r /c:":3000[^0-9]" ^| findstr LISTENING') do (
    if not "%%p"=="" (
        echo Killing process %%p currently listening on Port 3000 ^(Frontend^)...
        taskkill /F /PID %%p >nul 2>&1
    )
)

for /f "tokens=5" %%p in ('netstat -aon ^| findstr /r /c:":5000[^0-9]" ^| findstr LISTENING') do (
    if not "%%p"=="" (
        echo Killing process %%p currently listening on Port 5000 ^(Backend API^)...
        taskkill /F /PID %%p >nul 2>&1
    )
)
echo Ports successfully cleared.

:: 3. Verify and Install Dependencies
echo [2/5] Checking node_modules dependencies...
if not exist "backend\node_modules" (
    echo Backend dependencies not found. Installing backend packages...
    cd backend
    cmd /c npm install
    if errorlevel 1 (
        echo [ERROR] Backend npm install failed!
        cd ..
        pause
        exit /b
    )
    cd ..
)

if not exist "frontend\node_modules" (
    echo Frontend dependencies not found. Installing frontend packages...
    cd frontend
    cmd /c npm install
    if errorlevel 1 (
        echo [ERROR] Frontend npm install failed!
        cd ..
        pause
        exit /b
    )
    cd ..
)

:: 4. Build backend if needed
echo [3/5] Verifying Backend compiled assets...
if not exist "backend\dist\server.js" (
    echo Backend assets not found. Compiling backend...
    cd backend
    cmd /c npm run build
    if errorlevel 1 (
        echo [ERROR] Backend compilation failed!
        cd ..
        pause
        exit /b
    )
    cd ..
)

:: 5. Build frontend if needed
echo [4/5] Verifying Frontend compiled assets...
if not exist "frontend\.next\BUILD_ID" (
    echo Frontend production build not found. Compiling optimized production build...
    cd frontend
    echo Compiling Tailwind CSS stylesheet...
    cmd /c npx tailwindcss -i src/styles/globals.css -o src/styles/tailwind-compiled.css
    echo Building Next.js production bundle...
    cmd /c npm run build
    if errorlevel 1 (
        echo [ERROR] Frontend compilation failed!
        cd ..
        pause
        exit /b
    )
    cd ..
)

:: 6. Launch Backend API Server
echo [5/5] Initializing Backend API Server (Port 5000)...
start "Omnidesk OS Backend API" /D "backend" cmd /k npm run start

:: 7. Launch Frontend Next.js Client
echo [6/5] Initializing Frontend Next.js Client (Port 3000)...
start "Omnidesk OS Frontend UI" /D "frontend" cmd /k npm run start

:: 8. Open browser automatically once booted
echo Opening browser dashboard at http://localhost:3000...
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo ====================================================================
echo Omnidesk OS has been launched successfully!
echo.
echo  - Frontend Client: http://localhost:3000
echo  - Backend REST API: http://localhost:5000/api/v1
echo  - WebSocket Stream: ws://localhost:5000/ws
echo.
echo Keep this window open if you want to inspect launcher parameters, 
echo or close it at any time.
echo ====================================================================
echo.
pause

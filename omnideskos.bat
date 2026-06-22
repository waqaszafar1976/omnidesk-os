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

echo Select Frontend Application to launch:
echo  [1] Main Next.js Frontend (Production Build, Port 3000)
echo  [2] New Custom Dashboard (Development Server, Port 3000) [Recommended]
echo.
set /p choice="Enter choice (1 or 2, default is 2): "
if "%choice%"=="" set choice=2

if "%choice%"=="1" goto LAUNCH_FRONTEND_NEXT
if "%choice%"=="2" goto LAUNCH_FRONTEND_DASHBOARD

:: Fallback if invalid choice
echo Invalid choice, defaulting to Custom Dashboard.
set choice=2
goto LAUNCH_FRONTEND_DASHBOARD

:LAUNCH_FRONTEND_NEXT
if not exist "frontend" (
    echo [ERROR] Frontend folder not found!
    pause
    exit /b
)
goto CLEAR_PORTS

:LAUNCH_FRONTEND_DASHBOARD
if not exist "omnidesk-dashboard" (
    echo [ERROR] Custom Dashboard folder (omnidesk-dashboard) not found!
    pause
    exit /b
)
goto CLEAR_PORTS

:: 2. Terminate any active process holding port 3000 or 5000
:CLEAR_PORTS
echo [1/5] Scanning and recovering network ports 3000 ^& 5000...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr /r /c:":3000[^0-9]" ^| findstr LISTENING') do (
    if not "%%p"=="" (
        echo Killing process %%p currently listening on Port 3000...
        taskkill /F /PID %%p >nul 2>&1
    )
)

for /f "tokens=5" %%p in ('netstat -aon ^| findstr /r /c:":5000[^0-9]" ^| findstr LISTENING') do (
    if not "%%p"=="" (
        echo Killing process %%p currently listening on Port 5000...
        taskkill /F /PID %%p >nul 2>&1
    )
)
echo Ports successfully cleared.
goto CHECK_DEPS

:: 3. Verify and Install Dependencies
:CHECK_DEPS
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

if "%choice%"=="1" goto DEPS_NEXT
goto DEPS_DASHBOARD

:DEPS_NEXT
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
goto BUILD_BACKEND

:DEPS_DASHBOARD
if not exist "omnidesk-dashboard\node_modules" (
    echo Custom Dashboard dependencies not found. Installing dashboard packages...
    cd omnidesk-dashboard
    cmd /c npm install
    if errorlevel 1 (
        echo [ERROR] Custom Dashboard npm install failed!
        cd ..
        pause
        exit /b
    )
    cd ..
)
goto BUILD_BACKEND

:: 4. Build backend if needed
:BUILD_BACKEND
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

if "%choice%"=="1" goto BUILD_FRONTEND_NEXT
goto BUILD_FRONTEND_DASHBOARD

:: 5. Build frontend if choice is 1
:BUILD_FRONTEND_NEXT
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
goto RUN_APPS

:BUILD_FRONTEND_DASHBOARD
echo [4/5] Skipping Next.js compilation...
goto RUN_APPS

:: 6. Launch Services
:RUN_APPS
echo [5/5] Initializing Backend API Server...
start "Omnidesk OS Backend API" /D "backend" cmd /k npm run start

if "%choice%"=="1" goto RUN_FRONTEND_NEXT
goto RUN_FRONTEND_DASHBOARD

:RUN_FRONTEND_NEXT
echo [6/5] Initializing Frontend Next.js Client on Port 3000...
start "Omnidesk OS Frontend UI" /D "frontend" cmd /k npm run start
goto RUN_BROWSER

:RUN_FRONTEND_DASHBOARD
echo [6/5] Initializing Custom Dashboard on Port 3000...
start "Omnidesk OS Custom Dashboard" /D "omnidesk-dashboard" cmd /k "set PORT=3000 && npm run start"
goto RUN_BROWSER

:: 8. Open browser automatically once booted
:RUN_BROWSER
echo Opening browser dashboard at http://localhost:3000...
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo ====================================================================
echo Omnidesk OS has been launched successfully!
echo.
echo  - Selected Frontend: http://localhost:3000
echo  - Backend REST API: http://localhost:5000/api/v1
echo  - WebSocket Stream: ws://localhost:5000/ws
echo.
echo Keep this window open if you want to inspect launcher parameters, 
echo or close it at any time.
echo ====================================================================
echo.
pause

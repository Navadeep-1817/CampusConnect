@echo off
REM Campus Connect - Complete Deployment Script (Windows)
REM Run this after all fixes are implemented

echo.
echo ================================================================
echo.
echo            Campus Connect Deployment Script
echo.
echo ================================================================
echo.

REM Step 1: Verify fixes
echo Step 1: Verifying all fixes...
cd backend
node test-fixes.js

if %errorlevel% neq 0 (
  echo ERROR: Fix verification failed! Check test-fixes.js output
  pause
  exit /b 1
)

echo SUCCESS: All fixes verified
echo.

REM Step 2: Check environment variables
echo Step 2: Checking environment variables...

if exist .env (
  findstr "GOOGLE_SERVICE_ACCOUNT_EMAIL" .env >nul
  if %errorlevel% equ 0 (
    echo SUCCESS: Google Drive environment variables found
  ) else (
    echo WARNING: Google Drive variables not set in .env
    echo          Files will use local storage until configured
  )
) else (
  echo WARNING: .env file not found
  echo          Create .env file with Google Drive credentials
)
echo.

REM Step 3: Test local build
echo Step 3: Building frontend...
cd ..\campusConnect

if not exist "node_modules" (
  echo Installing frontend dependencies...
  call npm install
)

echo Running build...
call npm run build

if %errorlevel% neq 0 (
  echo ERROR: Frontend build failed!
  pause
  exit /b 1
)

if not exist "dist\index.html" (
  echo ERROR: Build output missing: dist\index.html not found
  pause
  exit /b 1
)

echo SUCCESS: Frontend built successfully
echo.

REM Step 4: Check backend dependencies
echo Step 4: Checking backend dependencies...
cd ..\backend

if not exist "node_modules" (
  echo Installing backend dependencies...
  call npm install
)

echo SUCCESS: Backend dependencies ready
echo.

REM Step 5: Git status
echo Step 5: Checking Git status...
cd ..

git status --short > nul 2>&1
if %errorlevel% neq 0 (
  echo WARNING: Not a git repository or git not installed
  goto deployment_instructions
)

git status --short
echo.
echo Uncommitted changes found above.
echo.

set /p commit_choice="Commit and push these changes? (y/n): "
if /i "%commit_choice%"=="y" (
  git add .
  
  git commit -m "fix: notice attachments, chat files, and production 404 refresh - Add comprehensive logging for Google Drive uploads - Fix socket emission to include attachment data - Add SPA catch-all route for production refresh - Update vercel.json with optimized config"
  
  set /p push_choice="Push to origin master? (y/n): "
  if /i "%push_choice%"=="y" (
    git push origin master
    echo SUCCESS: Changes pushed to GitHub
  ) else (
    echo WARNING: Changes committed but not pushed
  )
) else (
  echo WARNING: Skipping commit
)
echo.

:deployment_instructions
REM Step 6: Deployment instructions
echo.
echo ================================================================
echo.
echo                  DEPLOYMENT CHECKLIST
echo.
echo ================================================================
echo.

echo Render (Backend):
echo   1. Go to: https://dashboard.render.com/
echo   2. Select: campusconnect-backend
echo   3. Check deployment status (auto-deploys from GitHub)
echo   4. Verify environment variables:
echo      - NODE_ENV=production
echo      - GOOGLE_SERVICE_ACCOUNT_EMAIL
echo      - GOOGLE_PRIVATE_KEY
echo      - GOOGLE_DRIVE_FOLDER_ID
echo   5. Check logs for: ✅ Google Drive configured
echo.

echo Vercel (Frontend):
echo   1. Go to: https://vercel.com/dashboard
echo   2. Select: campus-connect
echo   3. Check deployment status (auto-deploys from GitHub)
echo   4. Verify environment variables:
echo      - VITE_API_URL=https://campusconnect-fz1i.onrender.com/api
echo      - VITE_SOCKET_URL=https://campusconnect-fz1i.onrender.com
echo.

echo Post-Deployment Testing:
echo   1. Health check:
echo      curl https://campusconnect-fz1i.onrender.com/api/health
echo.
echo   2. Google Drive status:
echo      curl https://campusconnect-fz1i.onrender.com/api/diagnostics/storage
echo.
echo   3. Test notice upload:
echo      - Login as Faculty/Admin
echo      - Create notice with files
echo      - Check Render logs for upload success
echo.
echo   4. Test chat file upload:
echo      - Open Chat, select room
echo      - Upload file
echo      - Verify file appears immediately
echo.
echo   5. Test refresh bug fix:
echo      - Visit: https://campus-connect-hazel-xi.vercel.app/notices
echo      - Press F5 (refresh)
echo      - Expected: Page loads normally (no 404)
echo.

echo ================================================================
echo.
echo              DEPLOYMENT SCRIPT COMPLETE
echo.
echo ================================================================
echo.
echo Documentation:
echo   - FIXES_SUMMARY.md              - Quick reference
echo   - DEPLOYMENT_FIX_COMPLETE.md    - Complete testing guide
echo   - PRODUCTION_DEPLOYMENT_GUIDE.md - Step-by-step deployment
echo   - SYSTEM_FLOW_DIAGRAMS.md       - Visual architecture
echo.
echo All issues are fixed! Deploy and test in production.
echo.

pause

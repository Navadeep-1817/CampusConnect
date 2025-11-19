#!/bin/bash

# 🚀 Campus Connect - Complete Deployment Script
# Run this after all fixes are implemented

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║        🎓 Campus Connect Deployment Script 🎓            ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Verify fixes
echo "${BLUE}Step 1: Verifying all fixes...${NC}"
cd backend
node test-fixes.js

if [ $? -ne 0 ]; then
  echo "${RED}❌ Fix verification failed! Check test-fixes.js output${NC}"
  exit 1
fi

echo "${GREEN}✅ All fixes verified${NC}"
echo ""

# Step 2: Check environment variables
echo "${BLUE}Step 2: Checking environment variables...${NC}"

if [ -f .env ]; then
  if grep -q "GOOGLE_SERVICE_ACCOUNT_EMAIL" .env && \
     grep -q "GOOGLE_PRIVATE_KEY" .env && \
     grep -q "GOOGLE_DRIVE_FOLDER_ID" .env; then
    echo "${GREEN}✅ Google Drive environment variables found${NC}"
  else
    echo "${YELLOW}⚠️  Warning: Google Drive variables not set in .env${NC}"
    echo "   Files will use local storage until configured"
  fi
else
  echo "${YELLOW}⚠️  Warning: .env file not found${NC}"
  echo "   Create .env file with Google Drive credentials"
fi
echo ""

# Step 3: Test local build
echo "${BLUE}Step 3: Building frontend...${NC}"
cd ../campusConnect

if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi

echo "Running build..."
npm run build

if [ $? -ne 0 ]; then
  echo "${RED}❌ Frontend build failed!${NC}"
  exit 1
fi

if [ ! -f "dist/index.html" ]; then
  echo "${RED}❌ Build output missing: dist/index.html not found${NC}"
  exit 1
fi

echo "${GREEN}✅ Frontend built successfully${NC}"
echo ""

# Step 4: Check backend dependencies
echo "${BLUE}Step 4: Checking backend dependencies...${NC}"
cd ../backend

if [ ! -d "node_modules" ]; then
  echo "Installing backend dependencies..."
  npm install
fi

echo "${GREEN}✅ Backend dependencies ready${NC}"
echo ""

# Step 5: Commit changes
echo "${BLUE}Step 5: Preparing Git commit...${NC}"
cd ..

# Check if there are changes to commit
if [[ -n $(git status -s) ]]; then
  echo "Uncommitted changes found:"
  git status -s
  echo ""
  
  read -p "Commit and push these changes? (y/n) " -n 1 -r
  echo ""
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add .
    
    # Generate commit message
    COMMIT_MSG="fix: notice attachments, chat files, and production 404 refresh

- Add comprehensive logging for Google Drive uploads in notice and chat controllers
- Fix socket emission to include attachment data in chat messages  
- Add SPA catch-all route to serve index.html for all non-API routes
- Update vercel.json with optimized SPA configuration
- Add deployment guides and test scripts

Fixes #1 (notice attachments), #2 (chat files), #3 (404 on refresh)"
    
    git commit -m "$COMMIT_MSG"
    
    echo ""
    read -p "Push to origin master? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      git push origin master
      echo "${GREEN}✅ Changes pushed to GitHub${NC}"
    else
      echo "${YELLOW}⚠️  Changes committed but not pushed${NC}"
    fi
  else
    echo "${YELLOW}⚠️  Skipping commit${NC}"
  fi
else
  echo "${GREEN}✅ No uncommitted changes${NC}"
fi
echo ""

# Step 6: Deployment instructions
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║               📋 DEPLOYMENT CHECKLIST                    ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "${BLUE}Render (Backend):${NC}"
echo "  1. Go to: https://dashboard.render.com/"
echo "  2. Select: campusconnect-backend"
echo "  3. Check deployment status (should auto-deploy from GitHub)"
echo "  4. Verify environment variables:"
echo "     - NODE_ENV=production"
echo "     - GOOGLE_SERVICE_ACCOUNT_EMAIL"
echo "     - GOOGLE_PRIVATE_KEY"
echo "     - GOOGLE_DRIVE_FOLDER_ID"
echo "  5. Check logs for: ✅ Google Drive configured"
echo ""

echo "${BLUE}Vercel (Frontend):${NC}"
echo "  1. Go to: https://vercel.com/dashboard"
echo "  2. Select: campus-connect"
echo "  3. Check deployment status (should auto-deploy from GitHub)"
echo "  4. Verify environment variables:"
echo "     - VITE_API_URL=https://campusconnect-fz1i.onrender.com/api"
echo "     - VITE_SOCKET_URL=https://campusconnect-fz1i.onrender.com"
echo ""

echo "${BLUE}Post-Deployment Testing:${NC}"
echo "  1. Health check:"
echo "     curl https://campusconnect-fz1i.onrender.com/api/health"
echo ""
echo "  2. Google Drive status:"
echo "     curl https://campusconnect-fz1i.onrender.com/api/diagnostics/storage"
echo ""
echo "  3. Test notice upload:"
echo "     - Login as Faculty/Admin"
echo "     - Create notice with files"
echo "     - Check Render logs for upload success"
echo ""
echo "  4. Test chat file upload:"
echo "     - Open Chat, select room"
echo "     - Upload file"
echo "     - Verify file appears immediately"
echo ""
echo "  5. Test refresh bug fix:"
echo "     - Visit: https://campus-connect-hazel-xi.vercel.app/notices"
echo "     - Press F5 (refresh)"
echo "     - Expected: Page loads normally (no 404)"
echo ""

echo "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo "${GREEN}║                                                           ║${NC}"
echo "${GREEN}║              ✅ DEPLOYMENT SCRIPT COMPLETE               ║${NC}"
echo "${GREEN}║                                                           ║${NC}"
echo "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "📚 Documentation:"
echo "  - FIXES_SUMMARY.md              → Quick reference"
echo "  - DEPLOYMENT_FIX_COMPLETE.md    → Complete testing guide"
echo "  - PRODUCTION_DEPLOYMENT_GUIDE.md → Step-by-step deployment"
echo "  - SYSTEM_FLOW_DIAGRAMS.md       → Visual architecture"
echo ""
echo "🎉 All issues are fixed! Deploy and test in production."

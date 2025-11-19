#!/usr/bin/env node

/**
 * Quick test script to verify all 3 fixes work locally
 * Run: node test-fixes.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n🧪 Testing Deployment Fixes...\n');

// Test 1: Check Google Drive Service
console.log('📋 Test 1: Google Drive Configuration');
try {
  const googleDrivePath = path.join(__dirname, 'services', 'googleDriveService.js');
  if (fs.existsSync(googleDrivePath)) {
    const content = fs.readFileSync(googleDrivePath, 'utf8');
    
    if (content.includes('isGoogleDriveConfigured') && 
        content.includes('uploadToGoogleDrive') &&
        content.includes('BEGIN PRIVATE KEY')) {
      console.log('✅ Google Drive service has proper key validation');
    } else {
      console.log('❌ Google Drive service missing key validation');
    }
  } else {
    console.log('❌ googleDriveService.js not found');
  }
} catch (error) {
  console.log('❌ Error checking Google Drive service:', error.message);
}

// Test 2: Check Notice Controller has logging
console.log('\n📋 Test 2: Notice Controller Logging');
try {
  const noticeControllerPath = path.join(__dirname, 'controllers', 'noticeController.js');
  if (fs.existsSync(noticeControllerPath)) {
    const content = fs.readFileSync(noticeControllerPath, 'utf8');
    
    if (content.includes('📁 Files to upload:') && 
        content.includes('⬆️  Uploading notice file:') &&
        content.includes('📎 Notice attachments array:')) {
      console.log('✅ Notice controller has comprehensive logging');
    } else {
      console.log('❌ Notice controller missing detailed logging');
    }
  } else {
    console.log('❌ noticeController.js not found');
  }
} catch (error) {
  console.log('❌ Error checking notice controller:', error.message);
}

// Test 3: Check Chat Controller has socket emission fix
console.log('\n📋 Test 3: Chat Controller Socket Emission');
try {
  const chatControllerPath = path.join(__dirname, 'controllers', 'chatController.js');
  if (fs.existsSync(chatControllerPath)) {
    const content = fs.readFileSync(chatControllerPath, 'utf8');
    
    if (content.includes('toObject()') && 
        content.includes('📤 Emitting chat message via socket:') &&
        content.includes('hasAttachments')) {
      console.log('✅ Chat controller emits attachments via socket');
    } else {
      console.log('❌ Chat controller missing socket emission fix');
    }
  } else {
    console.log('❌ chatController.js not found');
  }
} catch (error) {
  console.log('❌ Error checking chat controller:', error.message);
}

// Test 4: Check Server has SPA catch-all route
console.log('\n📋 Test 4: SPA Catch-All Route');
try {
  const serverPath = path.join(__dirname, 'server.js');
  if (fs.existsSync(serverPath)) {
    const content = fs.readFileSync(serverPath, 'utf8');
    
    // Check if catch-all route exists
    if (content.includes('SPA CATCH-ALL ROUTE') && 
        content.includes("app.get('*'") &&
        content.includes('index.html')) {
      console.log('✅ SPA catch-all route configured');
      
      // Check route order (catch-all should be before 404 handler)
      const catchAllIndex = content.indexOf('SPA CATCH-ALL ROUTE');
      const notFoundIndex = content.indexOf('Handle 404');
      
      if (catchAllIndex < notFoundIndex && catchAllIndex > 0 && notFoundIndex > 0) {
        console.log('✅ Route order is correct (catch-all before 404)');
      } else {
        console.log('⚠️  Warning: Check route order in server.js');
      }
    } else {
      console.log('❌ SPA catch-all route not found');
    }
  } else {
    console.log('❌ server.js not found');
  }
} catch (error) {
  console.log('❌ Error checking server:', error.message);
}

// Test 5: Check environment variables
console.log('\n📋 Test 5: Environment Configuration');
const requiredEnvVars = [
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_DRIVE_FOLDER_ID'
];

let envConfigured = true;
requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName} is set`);
  } else {
    console.log(`⚠️  ${varName} not set (files will use local storage)`);
    envConfigured = false;
  }
});

if (!envConfigured) {
  console.log('\n💡 Tip: Create .env file with Google Drive credentials to enable cloud storage');
}

// Test 6: Check frontend vercel.json
console.log('\n📋 Test 6: Frontend Vercel Configuration');
try {
  const vercelPath = path.join(__dirname, '..', 'campusConnect', 'vercel.json');
  if (fs.existsSync(vercelPath)) {
    const content = fs.readFileSync(vercelPath, 'utf8');
    const config = JSON.parse(content);
    
    if (config.rewrites && config.rewrites[0].destination === '/index.html') {
      console.log('✅ Vercel.json has SPA rewrite rule');
    } else if (config.routes && config.routes[0].dest === '/index.html') {
      console.log('✅ Vercel.json has SPA route rule');
    } else {
      console.log('❌ Vercel.json missing SPA configuration');
    }
  } else {
    console.log('⚠️  vercel.json not found in campusConnect/');
  }
} catch (error) {
  console.log('❌ Error checking vercel.json:', error.message);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Test Summary');
console.log('='.repeat(50));
console.log('\nIf all tests show ✅, your fixes are properly implemented!');
console.log('\n📚 Next steps:');
console.log('1. Set Google Drive environment variables in .env');
console.log('2. Test locally: npm start (backend) + npm run dev (frontend)');
console.log('3. Deploy to Render + Vercel');
console.log('4. Test production with DEPLOYMENT_FIX_COMPLETE.md checklist\n');

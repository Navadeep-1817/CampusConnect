# 🔒 Security Alert - Credentials Exposure

## ⚠️ CRITICAL SECURITY ISSUE DETECTED

Your Gmail App Password is **publicly visible** in your repository at:
- `backend/.env` (committed to git)

**Risk:** Anyone with access to your repository can:
- Send emails as you
- Access your Gmail API quota
- Potentially access other Google services

---

## 🚨 IMMEDIATE ACTIONS REQUIRED

### 1. Revoke the Exposed Password (NOW!)

1. Go to: https://myaccount.google.com/apppasswords
2. Find password: `krst hmhk yabz vxtc`
3. Click **"Remove"** or **"Revoke"**
4. Confirm deletion

### 2. Generate New App Password

1. Same page: https://myaccount.google.com/apppasswords
2. Click "Select app" → "Mail"
3. Click "Select device" → "Other" → Enter "CampusConnect Production"
4. Click **"Generate"**
5. Copy the 16-character password
6. **DO NOT commit this to git!**

### 3. Update Render Environment

1. Go to Render Dashboard
2. Select your service
3. Environment tab
4. Update `EMAIL_PASSWORD` with new password
5. Save changes

### 4. Clean Up Repository

**Remove .env from git history:**

```bash
# Navigate to project root
cd e:\AA-MernStack\React\CampusConnect

# Remove .env from git tracking
git rm --cached backend/.env

# Add to .gitignore if not already there
echo "backend/.env" >> .gitignore
echo "campusConnect/.env" >> .gitignore

# Commit the removal
git add .gitignore
git commit -m "chore: remove .env files from git tracking"

# Push to remote
git push origin master
```

**Note:** This removes the file from future commits, but **old commits still have it**!

To completely remove from git history (advanced):
```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

⚠️ **Warning:** Force pushing rewrites history. Coordinate with team first!

---

## ✅ Security Best Practices

### 1. Never Commit Secrets

**Files to NEVER commit:**
- `.env`
- `.env.local`
- `.env.production`
- Any file with passwords, API keys, tokens
- Private keys (.pem, .key files)

**Your .gitignore should include:**
```gitignore
# Environment variables
.env
.env.local
.env.production
.env.*.local
*.env

# Secrets
secrets.json
credentials.json
*.pem
*.key
*.p12

# Uploads
uploads/
*.log
```

### 2. Use Environment Variables

**Local Development:**
- Store in `.env` (gitignored)
- Use `.env.example` (committed) as template

**Production:**
- Use Render/Vercel environment variables
- Never hardcode in code
- Use secrets management (AWS Secrets Manager, etc.)

### 3. Rotate Credentials Regularly

**Schedule:**
- Every 3 months: Rotate passwords
- After team member leaves: Rotate all shared credentials
- After suspected breach: Rotate immediately

### 4. Limit Permissions

**Gmail App Passwords:**
- Only grant "Mail" access
- Don't use main account password
- One app password per application

**AWS IAM:**
- Use least privilege principle
- Create dedicated user per service
- Enable MFA on root account

### 5. Monitor for Breaches

**GitHub Secret Scanning:**
- Enable on your repository
- GitHub will alert you if secrets are detected

**GitGuardian:**
- Free for public repos
- Scans for exposed secrets

---

## 📋 Security Checklist

### Immediate (Within 1 hour):
- [ ] Revoke exposed Gmail App Password
- [ ] Generate new App Password
- [ ] Update Render environment variables
- [ ] Remove `.env` from git tracking
- [ ] Test that new password works

### Short Term (Within 1 week):
- [ ] Update `.gitignore` properly
- [ ] Create `.env.example` template
- [ ] Document environment setup
- [ ] Audit other secrets in codebase
- [ ] Enable GitHub secret scanning

### Long Term:
- [ ] Implement secrets rotation schedule
- [ ] Use secrets management service (AWS Secrets Manager)
- [ ] Add pre-commit hooks to prevent committing secrets
- [ ] Document security procedures
- [ ] Train team on security best practices

---

## 🛡️ Additional Security Recommendations

### 1. Secure Your Environment Variables

**Current `.env` contains:**
```env
# EXPOSED - Need to rotate:
EMAIL_PASSWORD=krst hmhk yabz vxtc  ❌ PUBLICLY VISIBLE

# SHOULD ROTATE:
JWT_SECRET=campus_connect_secret_key_2025_change_in_production  ⚠️ Weak

# OK (but should be in Render only):
MONGODB_URI=mongodb+srv://...  ⚠️ Semi-sensitive
```

**Actions:**
1. Generate strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

2. Update on Render:
```env
JWT_SECRET=<generated_64_char_string>
```

### 2. Enable Two-Factor Authentication

**On all accounts:**
- GitHub account
- Gmail account
- Render account
- Vercel account
- AWS account
- MongoDB Atlas

### 3. Use HTTPS Everywhere

**Current setup:**
- ✅ Vercel: HTTPS by default
- ✅ Render: HTTPS by default
- ✅ MongoDB Atlas: SSL/TLS by default

### 4. Implement Rate Limiting

**Add to server.js:**
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 5. Sanitize User Input

**Add validation:**
```bash
npm install express-validator
```

**Prevent SQL/NoSQL injection:**
- Use Mongoose schema validation
- Never use `$where` or `eval()`
- Sanitize user input

### 6. Set Security Headers

**Already using Helmet ✅**, but verify:
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

### 7. Audit Dependencies

**Check for vulnerabilities:**
```bash
cd backend
npm audit
npm audit fix
```

**Keep dependencies updated:**
```bash
npm outdated
npm update
```

---

## 🚨 Incident Response Plan

**If credentials are compromised:**

1. **Immediate (Within minutes):**
   - Revoke compromised credentials
   - Generate new credentials
   - Update all services
   - Monitor for unauthorized access

2. **Short term (Within hours):**
   - Review access logs
   - Identify impacted systems
   - Notify affected users if data breach
   - Document incident

3. **Long term:**
   - Implement additional security measures
   - Conduct security review
   - Update incident response procedures
   - Train team on security

---

## 📞 Resources

**Security Tools:**
- GitHub Secret Scanning: Built-in
- GitGuardian: https://www.gitguardian.com
- Snyk: https://snyk.io (dependency vulnerabilities)
- npm audit: Built-in

**Documentation:**
- OWASP Top 10: https://owasp.org/www-project-top-ten
- Node.js Security Best Practices: https://nodejs.org/en/docs/guides/security
- Express Security: https://expressjs.com/en/advanced/best-practice-security.html

**Emergency Contacts:**
- Gmail Security: https://support.google.com/accounts/answer/6294825
- GitHub Security: security@github.com
- MongoDB Security: security@mongodb.com

---

**Remember:** Security is an ongoing process, not a one-time fix. Review and update regularly!

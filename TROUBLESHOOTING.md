# Troubleshooting Guide

## Empty Backend Pages Issue

### Problem
After installing the plugin, admin pages show empty content.

### Solution

**Step 1: Verify React Build Files**
```bash
cd admin-ui
npm install
npm run build
```

Check that these files exist:
- `wordpress-plugin/assets/build/index.js`
- `wordpress-plugin/assets/build/assets/index.css`
- `wordpress-plugin/assets/build/index.asset.php`

**Step 2: Check Browser Console**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for JavaScript errors
4. Check Network tab for failed requests

**Step 3: Verify Script Enqueue**
The React app should be loaded. Check:
- Script is enqueued: `vinco-mam-admin`
- CSS is enqueued: `vinco-mam-admin`
- `window.vincoMAM` object exists in console

**Step 4: Check WordPress Settings**
- Ensure you have editor/admin permissions
- Verify API endpoint is configured in Settings
- Check that nonce is being generated

**Step 5: Clear Cache**
- Clear browser cache
- Clear WordPress cache (if using caching plugin)
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

## React App Not Mounting

### Debug Steps

1. **Check Container Element:**
   ```javascript
   // In browser console:
   document.getElementById('vinco-mam-root')
   ```
   Should return the div element, not null.

2. **Check React App Loaded:**
   ```javascript
   // In browser console:
   typeof React
   ```
   Should return "object" or "function".

3. **Check Routing:**
   The app uses hash routing. Check:
   - `window.location.hash` should update when navigating
   - Routes should match WordPress page parameter

## Settings Page Not Saving

### Issue
Settings don't persist after saving.

### Solution

1. **Check Permissions:**
   - Must have `manage_options` capability (admin)
   - Check user role in WordPress

2. **Check API Endpoint:**
   - Verify `/wp-json/vinco-mam/v1/settings` is accessible
   - Check Network tab for 401/403 errors

3. **Check WordPress Options:**
   ```php
   // In WordPress database or PHP:
   get_option('vinco_mam_settings')
   ```

## FileMage FTP Not Working

### Configuration Steps

1. **Get FileMage API Token:**
   - Log into FileMage admin portal
   - Go to Settings → API Tokens
   - Click "Add" to create new token
   - Copy the token

2. **Configure in WordPress:**
   - Go to Vinco MAM → Settings
   - Click "FileMage FTP" tab
   - Enter API URL (e.g., `https://your-filemage-instance.com/api`)
   - Enter API Token
   - Enter watch folders (one per line):
     ```
     /photographers/photographer1
     /photographers/photographer2
     /events/event-2024
     ```
   - Save settings

3. **Deploy AWS Infrastructure:**
   ```bash
   cd aws
   ./deploy.sh
   ```

4. **Update Lambda Environment:**
   After saving watch folders, update the Lambda environment variable:
   ```bash
   aws lambda update-function-configuration \
     --function-name VincoStack-FtpWatcher-XXXX \
     --environment "Variables={FILEMAGE_WATCH_FOLDERS=/photographers/photographer1\n/photographers/photographer2}" \
     --region eu-west-1
   ```

## Shortcodes Not Working

### Issue
Shortcodes render but show "Loading..." or errors.

### Solution

1. **Check API Endpoint:**
   - Settings → General → API Gateway Endpoint
   - Must be configured correctly

2. **Check Browser Console:**
   - Look for JavaScript errors
   - Check Network tab for API calls

3. **Verify jQuery:**
   ```javascript
   // In browser console:
   typeof jQuery
   ```
   Should return "function".

4. **Check API Access:**
   - Try accessing API directly:
     ```
     /wp-json/vinco-mam/v1/images
     ```
   - Should return JSON (may require authentication)

5. **Check Permissions:**
   - Public galleries should work without login
   - Authenticated galleries require WordPress login

## Common Errors

### "Unauthorized" Error
- **Cause:** Not logged in or insufficient permissions
- **Fix:** Log into WordPress as appropriate user

### "CORS Error"
- **Cause:** API Gateway CORS not configured
- **Fix:** Verify CDK stack has CORS enabled on API Gateway

### "Failed to fetch"
- **Cause:** API endpoint incorrect or network issue
- **Fix:** 
  - Check API Gateway endpoint in settings
  - Verify AWS infrastructure is deployed
  - Check browser console for exact error

### React App Shows Blank Page
- **Cause:** Routing issue or JavaScript error
- **Fix:**
  1. Check browser console for errors
  2. Verify React app is built
  3. Check that `#vinco-mam-root` element exists
  4. Try navigating manually: `#/gallery` or `#/settings`

## Still Having Issues?

1. **Check Logs:**
   - Browser console (F12)
   - WordPress debug.log (if WP_DEBUG enabled)
   - AWS CloudWatch logs for Lambda functions

2. **Verify Installation:**
   - Plugin is activated
   - React build files exist
   - Permissions are correct

3. **Re-install:**
   - Deactivate plugin
   - Delete plugin files
   - Upload fresh zip
   - Activate
   - Rebuild React app if needed

---

For more help, check:
- `DEPLOYMENT_TESTING.md` - API testing guide
- `PLUGIN_SETUP.md` - Setup instructions
- `COMPLETION_CHECKLIST.md` - Feature status

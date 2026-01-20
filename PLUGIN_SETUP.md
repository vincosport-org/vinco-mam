# WordPress Plugin Setup Guide

## ✅ Fixed Issues

### Empty Admin Pages
The React admin UI is now built and included in the plugin. The empty pages issue was because:
1. React app wasn't built yet
2. Build files weren't in the plugin assets folder

**Status**: ✅ Fixed - React app is now built and packaged

### Shortcodes for Frontend Display
Shortcodes have been added for displaying galleries on frontend pages.

## 📦 Installation

1. **Upload Plugin**:
   - Go to WordPress Admin > Plugins > Add New > Upload Plugin
   - Select `vinco-mam-plugin.zip`
   - Click "Install Now" then "Activate"

2. **Build Admin UI** (if needed - should already be built):
   ```bash
   cd admin-ui
   npm install
   npm run build
   ```
   This will output to `wordpress-plugin/assets/build/`

3. **Configure Settings**:
   - Go to **Vinco MAM > Settings**
   - Enter your AWS API Gateway endpoint
   - Enter WebSocket endpoint (if available)
   - Set AWS region: `eu-west-1`

## 🎨 Using Shortcodes on Frontend

### Gallery Shortcode
Display images from an event, photographer, or album:

```
[vinco_gallery event_id="123" limit="20" columns="4" lightbox="true"]
[vinco_gallery photographer_id="456" limit="50" columns="3"]
[vinco_gallery album_id="album-789" columns="4"]
```

**Parameters**:
- `event_id` - Filter by event ID
- `photographer_id` - Filter by photographer ID  
- `album_id` - Filter by album ID
- `limit` - Number of images (default: 20)
- `columns` - Grid columns 1-6 (default: 4)
- `lightbox` - Enable lightbox (default: true)
- `show_metadata` - Show image titles (default: false)

### Album Shortcode
Display a specific album:

```
[vinco_album id="album-123" columns="3" lightbox="true"]
```

**Parameters**:
- `id` - Album ID (required)
- `columns` - Grid columns (default: 4)
- `lightbox` - Enable lightbox (default: true)

### Single Image Shortcode
Display a single image:

```
[vinco_image id="img-123" size="large" caption="true" link="true"]
```

**Parameters**:
- `id` - Image ID (required)
- `size` - thumbnail, medium, large, original (default: large)
- `caption` - Show caption (default: false)
- `link` - Link to full size (default: false)

### Athlete Gallery Shortcode
Display images of a specific athlete:

```
[vinco_athlete_gallery athlete_id="123" limit="10" columns="3"]
```

**Parameters**:
- `athlete_id` - Athlete ID (required)
- `limit` - Number of images (default: 10)
- `columns` - Grid columns (default: 3)
- `lightbox` - Enable lightbox (default: true)

## 🔧 Troubleshooting

### Admin Pages Still Empty
1. **Check browser console** for JavaScript errors
2. **Verify build files exist**:
   ```bash
   ls wordpress-plugin/assets/build/
   ```
   Should see: `index.js`, `index.css`, `index.asset.php`
3. **Rebuild if needed**:
   ```bash
   cd admin-ui
   npm run build
   ```
4. **Check file permissions** - WordPress must be able to read the files

### Shortcodes Not Working
1. **Check API endpoint** is configured in Settings
2. **Verify REST API** is accessible:
   - Visit: `/wp-json/vinco-mam/v1/` 
   - Should return JSON (may need authentication)
3. **Check browser console** for JavaScript errors
4. **Ensure jQuery is loaded** - Shortcodes require jQuery

### Styles Not Loading
1. Clear browser cache
2. Check that `assets/frontend/style.css` exists
3. Verify file permissions

## 📝 Next Steps

1. **Deploy AWS Infrastructure** (if not done):
   ```bash
   cd aws
   ./deploy.sh
   ```

2. **Get API Endpoints** from CDK outputs:
   - REST API endpoint
   - WebSocket endpoint

3. **Configure Plugin** with endpoints

4. **Test Shortcodes** on a test page

5. **Upload Test Images** to verify the full workflow

---

**Plugin Zip**: `vinco-mam-plugin.zip` (updated with React build)

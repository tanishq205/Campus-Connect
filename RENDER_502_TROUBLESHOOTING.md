# Render 502 Error Troubleshooting Guide

If you're getting a 502 Bad Gateway error on Render, follow these steps:

## 1. Check Render Logs

1. Go to your Render Dashboard
2. Click on your backend service
3. Go to the **"Logs"** tab
4. Look for error messages - this will tell you what's failing

## 2. Verify Environment Variables

Make sure these are set in Render Dashboard → Environment:

### Required:
- `MONGODB_URI` - Your MongoDB connection string
- `PORT` - Usually set automatically by Render (don't override unless needed)

### Optional (but recommended):
- `CLIENT_URL` - Your frontend URL (e.g., `https://your-app.onrender.com`)
- `NODE_ENV` - Set to `production`
- `STREAM_API_KEY` - For Stream Chat (if using chat features)
- `STREAM_API_SECRET` - For Stream Chat (if using chat features)

## 3. Check Build & Start Commands

In Render Dashboard → Settings:

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
npm start
```

Make sure these match your `package.json` scripts.

## 4. Verify Package.json Scripts

Your `server/package.json` should have:
```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
```

## 5. Check Health Endpoint

After deployment, try accessing:
```
https://your-backend.onrender.com/health
```

This should return:
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": 123,
  "mongodb": "connected" or "disconnected"
}
```

If this works, your server is running but there might be routing issues.

## 6. Common Issues & Solutions

### Issue: Server crashes on startup
**Solution:** Check logs for:
- Missing environment variables
- Syntax errors in code
- Database connection failures (server should still start without DB)

### Issue: Port binding error
**Solution:** 
- Don't hardcode a port
- Use `process.env.PORT || 5000`
- Render automatically sets `PORT` environment variable

### Issue: MongoDB connection fails
**Solution:**
- Verify `MONGODB_URI` is correct
- Check if your IP is whitelisted in MongoDB Atlas
- Server should still start even if MongoDB fails (it will retry)

### Issue: Module not found errors
**Solution:**
- Make sure `package.json` has all dependencies
- Run `npm install` locally to verify
- Check that `node_modules` is in `.gitignore` (it should be)

### Issue: Stream Chat errors
**Solution:**
- If you're not using Stream Chat, the server should still work
- If using it, make sure `STREAM_API_KEY` and `STREAM_API_SECRET` are set

## 7. Test Locally First

Before deploying to Render, test locally:

```bash
cd server
npm install
npm start
```

If it works locally but not on Render, it's likely an environment variable issue.

## 8. Render-Specific Settings

In Render Dashboard:

1. **Environment:** Set `NODE_ENV=production`
2. **Auto-Deploy:** Enable if using Git
3. **Health Check Path:** Set to `/health` (optional, helps with monitoring)

## 9. Check Render Service Status

1. Go to Render Dashboard
2. Check if service shows "Live" (green) or "Failed" (red)
3. If "Failed", check the logs for the exact error

## 10. Quick Fixes

### If server won't start:
1. Check logs for the exact error
2. Verify all environment variables are set
3. Make sure `package.json` has correct start script
4. Ensure Node.js version is compatible (Render usually auto-detects)

### If you see "Cannot GET /":
- This is normal - the API is at `/api/*` endpoints
- Try `/health` or `/api/auth/test` (if you have test endpoints)

### If database operations fail:
- Server should still respond to `/health`
- Check MongoDB connection string
- Verify MongoDB Atlas network access (whitelist 0.0.0.0/0 for Render)

## Still Having Issues?

1. **Check Render Logs** - Most errors are visible there
2. **Test Health Endpoint** - `https://your-backend.onrender.com/health`
3. **Verify Environment Variables** - All required vars should be set
4. **Check Build Logs** - Make sure `npm install` succeeds
5. **Review Recent Changes** - Did you recently change code that might break startup?

## Health Check Endpoint

The server now includes a `/health` endpoint that returns:
- Server status
- Uptime
- MongoDB connection status

Use this to verify your server is running even if other endpoints fail.


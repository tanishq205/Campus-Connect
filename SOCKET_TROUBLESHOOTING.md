# Socket.io Connection Troubleshooting for Render

## Common Issues and Solutions

### Issue: "Failed to connect to chat server"

#### 1. Check Environment Variables

**Backend (Render Dashboard → Your Backend Service → Environment):**
- `CLIENT_URL` must match your frontend URL exactly (e.g., `https://campus-connect-web.onrender.com`)
- Make sure there's no trailing slash

**Frontend (Render Dashboard → Your Frontend Service → Environment):**
- `REACT_APP_SOCKET_URL` must be your backend URL (e.g., `https://campus-connect-api.onrender.com`)
- **Important**: Use `https://` not `http://` in production
- **Important**: Do NOT include `/api` in the socket URL
- Example: `REACT_APP_SOCKET_URL=https://campus-connect-api.onrender.com` ✅
- Wrong: `REACT_APP_SOCKET_URL=https://campus-connect-api.onrender.com/api` ❌

#### 2. Verify URLs Match

- Frontend URL: `https://campus-connect-web.onrender.com`
- Backend URL: `https://campus-connect-api.onrender.com`
- `CLIENT_URL` in backend = Frontend URL
- `REACT_APP_SOCKET_URL` in frontend = Backend URL (without `/api`)

#### 3. Check Render Logs

**Backend Logs:**
- Go to Render Dashboard → Your Backend Service → Logs
- Look for Socket.io connection errors
- Check if CORS errors appear

**Frontend Logs:**
- Open browser console (F12)
- Look for Socket.io connection errors
- Check the Network tab for WebSocket connection attempts

#### 4. Test Socket.io Connection

Open browser console on your frontend and run:
```javascript
// Check if socket URL is correct
console.log('Socket URL:', process.env.REACT_APP_SOCKET_URL);

// Try manual connection test
const testSocket = io(process.env.REACT_APP_SOCKET_URL, {
  transports: ['polling', 'websocket']
});

testSocket.on('connect', () => {
  console.log('✅ Socket connected!', testSocket.id);
});

testSocket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
});
```

#### 5. Common Fixes

**Fix 1: Update CORS Configuration**
- Make sure `CLIENT_URL` in backend matches frontend URL exactly
- Redeploy backend after changing `CLIENT_URL`

**Fix 2: Use HTTPS**
- Both frontend and backend must use `https://` in production
- Never use `http://` in production environment variables

**Fix 3: Check Render Free Tier Limitations**
- Render free tier may have WebSocket limitations
- Try using polling transport first: `transports: ['polling', 'websocket']`
- Consider upgrading to paid plan for better WebSocket support

**Fix 4: Verify Backend is Running**
- Check if backend health endpoint works: `https://your-backend.onrender.com/api/auth/health`
- Should return: `{"status":"ok","message":"Server is running"}`

**Fix 5: Clear Browser Cache**
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Clear browser cache and cookies
- Try incognito/private mode

#### 6. Debug Steps

1. **Check Environment Variables:**
   ```bash
   # In browser console
   console.log('API URL:', process.env.REACT_APP_API_URL);
   console.log('Socket URL:', process.env.REACT_APP_SOCKET_URL);
   ```

2. **Test Backend Socket.io:**
   - Visit: `https://your-backend.onrender.com/socket.io/?EIO=4&transport=polling`
   - Should return Socket.io handshake response (not 404)

3. **Check Network Tab:**
   - Open browser DevTools → Network tab
   - Filter by "WS" (WebSocket) or "polling"
   - Look for connection attempts to your backend
   - Check if requests are being blocked

4. **Check Render Logs:**
   - Backend logs should show: `🔌 User connected: <socket-id>`
   - If you don't see this, the connection isn't reaching the server

#### 7. Manual Configuration Check

**Backend (`server/index.js`):**
- Socket.io CORS should allow your frontend origin
- Check: `origin: process.env.CLIENT_URL`

**Frontend (`client/src/pages/Chat.js`):**
- Socket URL should be: `process.env.REACT_APP_SOCKET_URL`
- Transports should include: `['polling', 'websocket']`

#### 8. Render-Specific Issues

**Issue: Services Spinning Down**
- Free tier services spin down after 15 min of inactivity
- First request may take 30-60 seconds
- Socket connection may timeout during spin-up
- **Solution**: Keep services alive with a ping service or upgrade to paid plan

**Issue: WebSocket Blocking**
- Some proxies/load balancers block WebSocket connections
- **Solution**: Use polling transport first, then upgrade to WebSocket

**Issue: CORS with Render URLs**
- Render URLs use `.onrender.com` domain
- Make sure `CLIENT_URL` includes the full URL with `https://`
- Example: `https://campus-connect-web.onrender.com` ✅
- Wrong: `campus-connect-web.onrender.com` ❌

## Quick Checklist

- [ ] `CLIENT_URL` in backend = Frontend URL (with `https://`)
- [ ] `REACT_APP_SOCKET_URL` in frontend = Backend URL (with `https://`, no `/api`)
- [ ] Both services are deployed and running
- [ ] Backend health check works: `/api/auth/health`
- [ ] Browser console shows connection attempts
- [ ] Render logs show Socket.io connection attempts
- [ ] No CORS errors in browser console
- [ ] Using `https://` not `http://` in production

## Still Not Working?

1. **Check Render Status**: https://status.render.com
2. **Review Render Documentation**: https://render.com/docs
3. **Check Socket.io Documentation**: https://socket.io/docs/v4/
4. **Review Server Logs**: Look for specific error messages
5. **Test Locally**: Make sure it works locally first

## Example Working Configuration

**Backend Environment Variables:**
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://...
CLIENT_URL=https://campus-connect-web.onrender.com
```

**Frontend Environment Variables:**
```
REACT_APP_API_URL=https://campus-connect-api.onrender.com/api
REACT_APP_SOCKET_URL=https://campus-connect-api.onrender.com
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=...
REACT_APP_FIREBASE_STORAGE_BUCKET=...
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
```


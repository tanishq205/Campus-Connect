# Quick Start Guide for Render Deployment

## 🚀 Quick Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Deploy Backend (API)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `campus-connect-api`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Plan**: `Free`

5. Add Environment Variables:
   ```
   NODE_ENV=production
   MONGODB_URI=<your-mongodb-atlas-uri>
   CLIENT_URL=<will-update-after-frontend-deploy>
   ```

6. Click **"Create Web Service"**
7. **Copy the URL** (e.g., `https://campus-connect-api.onrender.com`)

### 3. Deploy Frontend (React)

1. In Render Dashboard, click **"New +"** → **"Static Site"**
2. Connect the same GitHub repository
3. Configure:
   - **Name**: `campus-connect-web`
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `client/build`
   - **Plan**: `Free`

4. Add Environment Variables:
   ```
   REACT_APP_API_URL=https://campus-connect-api.onrender.com/api
   REACT_APP_SOCKET_URL=https://campus-connect-api.onrender.com
   REACT_APP_FIREBASE_API_KEY=<your-firebase-api-key>
   REACT_APP_FIREBASE_AUTH_DOMAIN=<your-firebase-auth-domain>
   REACT_APP_FIREBASE_PROJECT_ID=<your-firebase-project-id>
   REACT_APP_FIREBASE_STORAGE_BUCKET=<your-firebase-storage-bucket>
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=<your-firebase-messaging-sender-id>
   REACT_APP_FIREBASE_APP_ID=<your-firebase-app-id>
   ```
   *(Replace `<your-firebase-...>` with your actual Firebase credentials)*

5. Click **"Create Static Site"**
6. **Copy the URL** (e.g., `https://campus-connect-web.onrender.com`)

### 4. Update Backend CLIENT_URL

1. Go back to your backend service
2. Update `CLIENT_URL` environment variable to your frontend URL
3. Save (auto-redeploys)

### 5. Update MongoDB Atlas

1. Go to MongoDB Atlas → Network Access
2. Add IP: `0.0.0.0/0` (allows all IPs)
3. Save

## ✅ Done!

Visit your frontend URL and test the application!

## 📝 Environment Variables Checklist

### Backend
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI=<mongodb-atlas-connection-string>`
- [ ] `CLIENT_URL=<frontend-url>`

### Frontend
- [ ] `REACT_APP_API_URL=<backend-url>/api`
- [ ] `REACT_APP_SOCKET_URL=<backend-url>`
- [ ] `REACT_APP_FIREBASE_API_KEY=<firebase-api-key>`
- [ ] `REACT_APP_FIREBASE_AUTH_DOMAIN=<firebase-auth-domain>`
- [ ] `REACT_APP_FIREBASE_PROJECT_ID=<firebase-project-id>`
- [ ] `REACT_APP_FIREBASE_STORAGE_BUCKET=<firebase-storage-bucket>`
- [ ] `REACT_APP_FIREBASE_MESSAGING_SENDER_ID=<firebase-messaging-sender-id>`
- [ ] `REACT_APP_FIREBASE_APP_ID=<firebase-app-id>`

## 🔍 Troubleshooting

- **Build fails?** Check build logs in Render Dashboard
- **App not working?** Check runtime logs
- **CORS errors?** Verify `CLIENT_URL` matches frontend URL
- **MongoDB errors?** Check connection string and Network Access
- **Socket not connecting?** Verify `REACT_APP_SOCKET_URL` is correct

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)


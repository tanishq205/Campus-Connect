# Deployment Guide for Render

This guide will help you deploy your Campus Connect application on Render.

## Prerequisites

1. A GitHub account
2. A Render account (sign up at [render.com](https://render.com))
3. MongoDB Atlas account (for database)
4. Firebase project (for authentication)

## Step 1: Prepare Your Repository

1. **Push your code to GitHub** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Make sure your `.env` files are NOT committed** (they should be in `.gitignore`)

## Step 2: Deploy Backend (API Server)

1. **Go to Render Dashboard** → Click "New +" → Select "Web Service"

2. **Connect your GitHub repository**:
   - Select your repository
   - Choose the branch (usually `main`)

3. **Configure the service**:
   - **Name**: `campus-connect-api` (or any name you prefer)
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Plan**: Choose `Free` (or upgrade if needed)

4. **Add Environment Variables**:
   Click "Add Environment Variable" and add:
   
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=<your-mongodb-atlas-connection-string>
   CLIENT_URL=<your-frontend-url> (e.g., https://campus-connect-web.onrender.com)
   ```
   
   **Important**: 
   - Get your MongoDB Atlas connection string from MongoDB Atlas dashboard
   - The `CLIENT_URL` will be your frontend URL (you'll set this after deploying frontend)
   - For MongoDB Atlas, make sure to whitelist `0.0.0.0/0` (all IPs) in Network Access

5. **Click "Create Web Service"**

6. **Wait for deployment** - Render will build and deploy your backend

7. **Copy your backend URL** - It will look like: `https://campus-connect-api.onrender.com`

## Step 3: Deploy Frontend (React App)

1. **Go to Render Dashboard** → Click "New +" → Select "Static Site"

2. **Connect your GitHub repository**:
   - Select the same repository
   - Choose the branch (usually `main`)

3. **Configure the service**:
   - **Name**: `campus-connect-web` (or any name you prefer)
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `client/build`
   - **Plan**: Choose `Free` (or upgrade if needed)

4. **Add Environment Variables**:
   Click "Add Environment Variable" and add:
   
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
   
   **Important**: 
   - Replace `<your-firebase-...>` with your actual Firebase credentials
   - The `REACT_APP_API_URL` should point to your backend URL from Step 2
   - The `REACT_APP_SOCKET_URL` should be your backend URL (without `/api`)

5. **Click "Create Static Site"**

6. **Wait for deployment** - Render will build and deploy your frontend

7. **Copy your frontend URL** - It will look like: `https://campus-connect-web.onrender.com`

## Step 4: Update Backend Environment Variables

1. **Go back to your backend service** in Render Dashboard

2. **Update the `CLIENT_URL` environment variable**:
   - Change it to your frontend URL from Step 3
   - Example: `https://campus-connect-web.onrender.com`

3. **Save changes** - Render will automatically redeploy

## Step 5: Update MongoDB Atlas Network Access

1. **Go to MongoDB Atlas Dashboard**

2. **Navigate to Network Access**

3. **Add IP Address**: `0.0.0.0/0` (allows all IPs)
   - Or add Render's IP ranges if you want to be more secure

4. **Save changes**

## Step 6: Test Your Deployment

1. **Visit your frontend URL** (e.g., `https://campus-connect-web.onrender.com`)

2. **Test the following**:
   - Sign up / Login
   - Create a project
   - Send a message in chat
   - Add a friend

3. **Check logs** in Render Dashboard if something doesn't work

## Troubleshooting

### Backend Issues

1. **Check build logs** in Render Dashboard
2. **Check runtime logs** for errors
3. **Verify environment variables** are set correctly
4. **Check MongoDB connection** - Make sure MongoDB Atlas is accessible

### Frontend Issues

1. **Check build logs** - Make sure build completes successfully
2. **Verify environment variables** - All `REACT_APP_*` variables must be set
3. **Check browser console** for errors
4. **Verify API URL** - Make sure it points to your backend

### Common Errors

1. **"Cannot connect to MongoDB"**:
   - Check MongoDB Atlas connection string
   - Verify Network Access allows Render IPs
   - Check if MongoDB Atlas cluster is running

2. **"CORS error"**:
   - Make sure `CLIENT_URL` in backend matches your frontend URL
   - Check CORS configuration in `server/index.js`

3. **"Socket connection failed"** or **"Failed to connect to chat server"**:
   - Verify `REACT_APP_SOCKET_URL` points to your backend URL (without `/api`)
   - Make sure `CLIENT_URL` in backend matches your frontend URL exactly
   - Check Render logs for Socket.io connection errors
   - Try using `https://` instead of `http://` in production
   - Ensure both frontend and backend are on HTTPS in production
   - Check if Render is blocking WebSocket connections (some free tiers have limitations)

4. **"Firebase error"**:
   - Verify all Firebase environment variables are set
   - Check Firebase project settings

## Environment Variables Summary

### Backend (API Server)
- `NODE_ENV=production`
- `PORT=10000` (or let Render assign automatically)
- `MONGODB_URI=<mongodb-atlas-connection-string>`
- `CLIENT_URL=<frontend-url>`

### Frontend (React App)
- `REACT_APP_API_URL=<backend-url>/api`
- `REACT_APP_SOCKET_URL=<backend-url>`
- `REACT_APP_FIREBASE_API_KEY=<firebase-api-key>`
- `REACT_APP_FIREBASE_AUTH_DOMAIN=<firebase-auth-domain>`
- `REACT_APP_FIREBASE_PROJECT_ID=<firebase-project-id>`
- `REACT_APP_FIREBASE_STORAGE_BUCKET=<firebase-storage-bucket>`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID=<firebase-messaging-sender-id>`
- `REACT_APP_FIREBASE_APP_ID=<firebase-app-id>`

## Notes

- **Free tier limitations**: 
  - Services may spin down after 15 minutes of inactivity
  - First request after spin-down may take 30-60 seconds
  - Consider upgrading to paid plan for production

- **Auto-deploy**: 
  - Render automatically deploys on every push to your main branch
  - You can disable this in service settings

- **Custom domains**: 
  - You can add custom domains in service settings
  - Update environment variables accordingly

## Support

If you encounter issues:
1. Check Render logs
2. Check browser console
3. Verify all environment variables
4. Check MongoDB Atlas and Firebase configurations


# Campus Connect - Setup Guide

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- Firebase account

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm run install-all
```

This will install dependencies for:
- Root package (concurrently for running both servers)
- Server (Node.js backend)
- Client (React frontend)

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Email/Password** authentication:
   - Go to Authentication > Sign-in method
   - Enable Email/Password provider
4. Get your Firebase configuration:
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Copy the Firebase configuration object

### 3. Environment Variables

#### Server Environment Variables

Create `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/campus-connect
CLIENT_URL=http://localhost:3000
```

**For MongoDB Atlas:**
- Create a cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Get your connection string
- Replace `MONGODB_URI` with your Atlas connection string

#### Client Environment Variables

Create `client/.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_FIREBASE_API_KEY=your-api-key-here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

Replace the values with your Firebase configuration.

### 4. Start MongoDB

**Local MongoDB:**
```bash
# On macOS/Linux
mongod

# On Windows
# Start MongoDB service from Services or run:
mongod.exe
```

**MongoDB Atlas:**
- No local setup needed, just use your connection string

### 5. Run the Application

```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend development server on `http://localhost:3000`

### 6. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Troubleshooting

### MongoDB Connection Issues

- **Local MongoDB**: Ensure MongoDB is running
- **MongoDB Atlas**: Check your IP whitelist and connection string
- Verify `MONGODB_URI` in `server/.env`

### Firebase Authentication Issues

- Verify all Firebase environment variables are set correctly
- Ensure Email/Password authentication is enabled in Firebase Console
- Check browser console for Firebase errors

### Port Already in Use

If port 5000 or 3000 is already in use:
- Change `PORT` in `server/.env`
- Update `REACT_APP_API_URL` in `client/.env` accordingly
- React dev server port can be changed by setting `PORT` environment variable

### CORS Errors

- Ensure `CLIENT_URL` in `server/.env` matches your frontend URL
- Check that both servers are running

## First Time Usage

1. **Sign Up**: Create a new account
2. **Complete Profile**: 
   - Add your college name
   - Add your branch and year
   - Add skills and interests
   - Add GitHub, LinkedIn, or portfolio links
3. **Create a Project**: Post your first project idea
4. **Explore**: Browse other projects and events
5. **Collaborate**: Join projects and use the chat feature

## Development Tips

- Use browser DevTools to debug
- Check server logs in the terminal
- MongoDB Compass can help visualize your database
- Firebase Console shows authentication logs

## Production Deployment

For production deployment:

1. Build the React app:
   ```bash
   cd client
   npm run build
   ```

2. Update environment variables for production URLs

3. Use a process manager like PM2 for Node.js:
   ```bash
   npm install -g pm2
   pm2 start server/index.js
   ```

4. Serve the React build with a static file server or integrate with your Node.js server


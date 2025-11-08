# Stream Chat Backend Setup

This guide will help you set up Stream Chat token generation on your backend.

## Step 1: Get Stream Chat API Key and Secret

1. Go to [Stream Chat Dashboard](https://dashboard.getstream.io/)
2. Select your app (or create one if you haven't)
3. Go to **"Chat"** → **"Overview"**
4. You'll see:
   - **API Key** (something like: `abc123xyz`)
   - **API Secret** (keep this secret! Never expose it in frontend)
5. Copy both values

## Step 2: Add to Backend Environment Variables

1. Open `server/.env` file
2. Add these two lines:
   ```
   STREAM_API_KEY=your-api-key-here
   STREAM_API_SECRET=your-api-secret-here
   ```
3. Replace with your actual values from Step 1
4. **IMPORTANT**: Never commit `.env` to git!

## Step 3: For Render Deployment

If you're deploying on Render:

1. Go to your backend service on Render
2. Click **"Environment"** tab
3. Add these environment variables:
   - `STREAM_API_KEY` = your API key
   - `STREAM_API_SECRET` = your API secret
4. Click **"Save Changes"**
5. Render will automatically redeploy

## Step 4: Restart Your Server

1. Stop your server (Ctrl+C)
2. Start it again: `npm run dev` (or `npm start`)

## Step 5: Test

1. Open your app
2. Go to chat page
3. It should connect successfully! ✅

## How It Works

- Frontend requests a token from your backend (`/api/stream-chat/token`)
- Backend generates a secure token using Stream Chat SDK
- Frontend uses this token to connect to Stream Chat
- This is the secure way to do it (dev tokens are not allowed in production)

## Troubleshooting

### "Failed to generate chat token"
- Check that `STREAM_API_KEY` and `STREAM_API_SECRET` are set in `server/.env`
- Make sure you restarted the server after adding them
- Verify the API key and secret are correct (no extra spaces)

### "Chat server error"
- Check backend logs for errors
- Verify Stream Chat package is installed: `npm list stream-chat` (in server folder)
- Make sure the route is registered in `server/index.js`

### Still not working?
- Check browser console for exact error
- Check server console for errors
- Verify API key and secret are correct in Stream Chat dashboard

That's it! Your chat should now work securely! 🎉


# Stream Chat Setup Guide

This guide will help you set up Stream Chat to replace Firebase Firestore for the chat feature.

## Step 1: Create Stream Chat Account

1. Go to [https://getstream.io/](https://getstream.io/)
2. Click **"Sign Up"** (it's free)
3. Create an account (you can use Google/GitHub to sign up quickly)
4. Verify your email if required

## Step 2: Create a New App

1. Once logged in, you'll see the dashboard
2. Click **"Create App"** or **"New App"**
3. Fill in:
   - **App Name**: Campus Connect (or any name)
   - **Region**: Choose closest to your users (e.g., US East, EU West)
   - **Environment**: Development (for now)
4. Click **"Create App"**

## Step 3: Get Your API Keys

1. After creating the app, you'll see the **"Chat"** section
2. Click on your app name
3. You'll see:
   - **API Key** (something like: `abc123xyz`)
   - **API Secret** (keep this secret, we won't use it in frontend)
4. Copy the **API Key**

## Step 4: Add API Key to Your Project

1. Open `client/.env` file
2. Add this line:
   ```
   REACT_APP_STREAM_API_KEY=your-api-key-here
   ```
3. Replace `your-api-key-here` with your actual API key from Step 3
4. Save the file

## Step 5: Restart Your React App

1. Stop your React app (Ctrl+C)
2. Start it again: `npm start` (from the root directory, or `npm run dev`)

## Step 6: Test the Chat

1. Open your app
2. Go to the chat page
3. Select a friend to chat with
4. Try sending a message
5. It should work immediately! 🎉

## How Stream Chat Works

- **Channels**: Each chat room is a "channel" in Stream Chat
- **Users**: Each user needs to be connected to Stream Chat
- **Messages**: Automatically synced in real-time
- **No Security Rules**: Stream Chat handles permissions automatically

## Free Tier Limits

- **1,000 Monthly Active Users (MAU)**
- **Unlimited messages**
- **Unlimited channels**
- Perfect for your campus app!

## Troubleshooting

### "Stream Chat API key is missing"
- Make sure you added `REACT_APP_STREAM_API_KEY` to `client/.env`
- Restart your React app after adding it

### "User not connected"
- Make sure you're logged in with Firebase Auth
- Stream Chat will automatically connect when you open chat

### Messages not appearing
- Check browser console for errors
- Make sure API key is correct
- Verify you're logged in

## Next Steps

Once Stream Chat is set up:
1. Chat will work immediately
2. No more Firestore timeout issues
3. Real-time messaging out of the box
4. Better reliability

That's it! Stream Chat is much simpler than Firestore for chat. 🚀


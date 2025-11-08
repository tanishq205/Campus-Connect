# Firebase Setup Instructions

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **Get Started**
3. Go to **Sign-in method** tab
4. Click on **Email/Password**
5. Enable it and click **Save**

## Step 3: Get Your Firebase Configuration

1. In Firebase Console, click the **gear icon** (⚙️) next to "Project Overview"
2. Select **Project settings**
3. Scroll down to **Your apps** section
4. If you don't have a web app, click **</>** (Web icon) to add one
5. Register your app with a nickname (e.g., "Campus Connect Web")
6. Copy the configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## Step 4: Create .env File

1. In the `client` folder, create a new file named `.env` (not `.env.txt` or anything else)
2. Add the following content, replacing with YOUR actual values:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_FIREBASE_API_KEY=AIzaSy...your-actual-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef
```

**Important Notes:**
- Replace ALL placeholder values with your actual Firebase config values
- Do NOT use quotes around the values
- Make sure there are NO spaces around the `=` sign
- The file must be named exactly `.env` (not `.env.txt`)

## Step 5: Restart React App

**CRITICAL:** After creating or updating the `.env` file, you MUST restart the React development server:

1. Stop the current server (Ctrl+C in the terminal)
2. Run `npm run dev` again

React only reads `.env` files when it starts, so changes won't take effect until you restart.

## Verification

After restarting, check the browser console. You should NOT see the Firebase configuration error anymore.

If you still see errors:
1. Double-check that your `.env` file is in the `client` folder (not the root folder)
2. Verify all values are correct (no typos, no quotes, no extra spaces)
3. Make sure you restarted the React app after creating/updating `.env`
4. Check that Email/Password authentication is enabled in Firebase Console


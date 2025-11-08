# Step-by-Step Guide: Enable Firestore in Firebase

Follow these exact steps to enable Firestore for your chat feature.

## Step 1: Go to Firebase Console

1. Open your web browser
2. Go to: **https://console.firebase.google.com/**
3. Sign in with your Google account (the same account you used to create your Firebase project)

## Step 2: Select Your Project

1. You'll see a list of your Firebase projects
2. **Click on your project** (the one you're using for Campus Connect)
   - If you don't see your project, make sure you're signed in with the correct Google account
   - If you don't have a project, you need to create one first

## Step 3: Navigate to Firestore Database

1. In the left sidebar, look for **"Firestore Database"**
   - It might be under "Build" section
   - Or it might be directly visible in the sidebar
2. **Click on "Firestore Database"**

## Step 4: Create Database (If Not Already Created)

1. You'll see one of two screens:

   **Option A: "Create database" button is visible**
   - Click the **"Create database"** button
   - Go to Step 5

   **Option B: Database already exists**
   - You'll see "Firestore Database" with collections/data
   - If you see this, Firestore is already enabled! ✅
   - Skip to Step 6 (Security Rules)

## Step 5: Configure Database

1. **Choose a security mode:**
   - Select **"Start in test mode"** (recommended for now)
   - This allows authenticated users to read/write
   - Click **"Next"**

2. **Select a location:**
   - Choose the location closest to your users
   - For example:
     - `us-central` (United States)
     - `europe-west` (Europe)
     - `asia-southeast1` (Asia)
   - **Important:** You can't change this later easily, so choose carefully
   - Click **"Enable"**

3. **Wait for setup:**
   - Firebase will set up your database (takes 1-2 minutes)
   - You'll see a progress indicator
   - Don't close the page!

## Step 6: Set Up Security Rules

1. Once the database is created, you'll see the Firestore Database page
2. Click on the **"Rules"** tab at the top
3. You'll see default rules that look like:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2024, 12, 31);
    }
  }
}
```

4. **Replace ALL the existing rules** with this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Chat messages collection
    match /chats/{roomId}/messages/{messageId} {
      // Allow read if user is authenticated
      allow read: if request.auth != null;
      
      // Allow write if user is authenticated and the message contains their Firebase UID
      // Note: userId must be the Firebase Auth UID (request.auth.uid), not MongoDB ID
      allow create: if request.auth != null 
        && request.resource.data.userId == request.auth.uid;
      
      // Prevent updates and deletes (messages are immutable)
      allow update, delete: if false;
    }
    
    // Default: deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

5. Click **"Publish"** button (usually at the top right)
6. You'll see a confirmation that rules were published

## Step 7: Verify Setup

1. Go to the **"Data"** tab in Firestore
2. You should see an empty database (no collections yet)
3. This is normal - collections will be created when messages are sent

## Step 8: Add Authorized Domain (For Production)

1. Go to **Authentication** → **Settings** (in left sidebar)
2. Scroll down to **"Authorized domains"**
3. Click **"Add domain"**
4. Enter: `campus-connect-web-1m8b.onrender.com`
5. Click **"Add"**

## Step 9: Test It!

1. Go back to your app
2. Open the chat page
3. Try sending a message
4. Check browser console (F12) for logs:
   - Should see: `📤 === SENDING MESSAGE ===`
   - Should see: `✅ Message sent to Firestore successfully`

5. **Verify in Firebase Console:**
   - Go to Firestore Database → Data tab
   - You should see:
     - `chats` collection
     - Inside: `friend-xxx-xxx` (or `project-xxx`)
     - Inside that: `messages` collection
     - Inside that: your message document

## Visual Guide

### What You Should See:

**After Step 3:**
```
Firestore Database
[Create database] button
```

**After Step 5:**
```
Firestore Database
[Data] [Rules] [Indexes] [Usage] tabs
Empty database (no collections)
```

**After Step 6:**
```
Rules tab
[Your security rules code]
[Publish] button
```

**After Sending a Message:**
```
Data tab
chats/
  friend-xxx-xxx/
    messages/
      [messageId]/
        text: "Hello!"
        userId: "firebase-uid"
        ...
```

## Troubleshooting

### "Create database" button not visible
- Make sure you're in the correct Firebase project
- Check if Firestore is already enabled (look for "Data" tab)
- Try refreshing the page

### Can't find "Firestore Database" in sidebar
- Look under "Build" section
- It might be collapsed - click to expand
- Make sure you're using the web console (not mobile app)

### Rules won't publish
- Check for syntax errors (missing brackets, quotes, etc.)
- Make sure you copied the entire rules block
- Try copying again and pasting

### Still getting "permission-denied" error
- Make sure rules are published (check Rules tab)
- Verify `userId` in message = Firebase Auth UID (not MongoDB ID)
- Check browser console for exact error

## Quick Checklist

- [ ] Opened Firebase Console
- [ ] Selected correct project
- [ ] Clicked "Firestore Database"
- [ ] Created database (or confirmed it exists)
- [ ] Selected "Start in test mode"
- [ ] Chose a location
- [ ] Database is enabled
- [ ] Security rules are set and published
- [ ] Authorized domain added (for production)
- [ ] Tested sending a message

## Need Help?

If you're stuck at any step:
1. Take a screenshot of what you see
2. Check browser console for errors
3. Verify you're in the correct Firebase project
4. Make sure you have permission to modify the project

Once Firestore is enabled and rules are published, your chat should work! 🎉


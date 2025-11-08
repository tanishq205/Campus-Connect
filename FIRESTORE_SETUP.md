# Firebase Firestore Setup for Chat

This guide will help you set up Firebase Firestore for the chat feature.

## Step 1: Enable Firestore in Firebase Console

**Detailed step-by-step instructions: See [ENABLE_FIRESTORE_STEP_BY_STEP.md](./ENABLE_FIRESTORE_STEP_BY_STEP.md)**

Quick steps:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on **"Firestore Database"** in the left sidebar
4. If you see **"Create database"** button, click it
5. Choose **"Start in test mode"** (we'll add security rules in Step 2)
6. Select a location for your database (choose the closest to your users)
   - Examples: `us-central`, `europe-west`, `asia-southeast1`
7. Click **"Enable"**
8. Wait 1-2 minutes for database to be created

## Step 2: Set Up Firestore Security Rules

1. In Firebase Console, go to **Firestore Database** → **Rules**
2. Replace the default rules with the following:

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

**Important Notes:**
- These rules allow any authenticated user to read messages in any chat room
- Users can only create messages with their own Firebase UID (userId field must match request.auth.uid)
- The code stores both `userId` (Firebase UID) and `mongoUserId` (MongoDB ID) in messages
- Messages cannot be updated or deleted (immutable)
- For production, you may want to add additional checks to ensure users can only access chats they're part of

## Step 3: Update Firebase Authentication

Make sure your Firebase Authentication is properly configured:

1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add your Render frontend URL: `campus-connect-web-1m8b.onrender.com`
3. This ensures Firebase Auth works on your deployed site

## Step 4: Firestore Data Structure

The chat system uses the following Firestore structure:

```
chats/
  {roomId}/
    messages/
      {messageId}/
        text: string
        userId: string (Firebase Auth UID - required for security rules)
        mongoUserId: string (MongoDB user ID - for matching with userData)
        userName: string
        userProfilePicture: string
        createdAt: timestamp
        timestamp: string (ISO format)
```

**Important Fields:**
- `userId`: Must be Firebase Auth UID (`currentUser.uid`) - used by security rules
- `mongoUserId`: MongoDB user ID (`userData._id`) - used for matching/display
- Both are stored so security rules work (Firebase UID) and display works (MongoDB ID)

**Room ID Format:**
- Friend chats: `friend-{userId1}-{userId2}` (sorted IDs)
- Project chats: `project-{projectId}`

## Step 5: Test the Setup

1. Deploy your updated code to Render
2. Open your app and try sending a message
3. Check Firebase Console → Firestore Database → Data
4. You should see messages appearing in real-time

## Troubleshooting

### Issue: "Missing or insufficient permissions"

**Solution:**
- Check your Firestore security rules
- Make sure the user is authenticated
- Verify the userId in the message matches the authenticated user's ID

### Issue: Messages not appearing

**Solution:**
- Check browser console for errors
- Verify Firestore is enabled in Firebase Console
- Check that security rules allow read access
- Verify the roomId is being generated correctly

### Issue: "Firestore (8.x.x) was not found"

**Solution:**
- Make sure you're using Firebase v9+ modular SDK (which we are)
- Check that `firebase/firestore` is imported correctly
- Verify Firebase package is installed: `npm list firebase`

## Security Rules for Production (Advanced)

For better security, you can restrict access to specific chat rooms:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is part of a friend chat
    function isFriendChatParticipant(roomId) {
      let userId = request.auth.uid;
      // Extract user IDs from roomId (format: friend-userId1-userId2)
      return roomId.matches('friend-.*') && 
             (roomId.matches('.*-' + userId + '.*') || 
              roomId.matches('.*-' + userId + '$'));
    }
    
    // Helper function to check if user is part of a project chat
    function isProjectChatParticipant(roomId) {
      // You would need to check against your MongoDB/backend
      // For now, allow if authenticated
      return request.auth != null;
    }
    
    match /chats/{roomId}/messages/{messageId} {
      // Allow read if user is part of the chat
      allow read: if request.auth != null 
        && (isFriendChatParticipant(roomId) || isProjectChatParticipant(roomId));
      
      // Allow create if user is authenticated and userId matches
      allow create: if request.auth != null 
        && request.resource.data.userId == request.auth.uid
        && (isFriendChatParticipant(roomId) || isProjectChatParticipant(roomId));
      
      allow update, delete: if false;
    }
  }
}
```

## Cost Considerations

Firebase Firestore free tier includes:
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day
- 1 GB storage

For a chat application:
- Each message sent = 1 write
- Each message received (real-time listener) = 1 read per user
- If 2 users chat, 1 message = 1 write + 2 reads

**Example:** 100 messages/day with 2 users = 100 writes + 200 reads = well within free tier

## Next Steps

1. ✅ Firestore is now enabled
2. ✅ Security rules are configured
3. ✅ Code is updated to use Firestore
4. ✅ Deploy to Render
5. ✅ Test the chat feature

Your chat should now work reliably across all devices and networks!


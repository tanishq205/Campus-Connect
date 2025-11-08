# Troubleshooting: Message Not Sending to Firestore

If you see "✅ Message sent to Firestore successfully" is **NOT** appearing, follow these steps:

## Step 1: Check Browser Console

Open your browser's Developer Tools (F12) and look for these logs when you try to send a message:

### What You Should See:

```
🔍 === PRE-SEND VALIDATION ===
roomId: friend-xxx-xxx
userData: Exists
currentUser: Exists
currentUser.uid: abc123...
db: Initialized
db type: object
🔍 === END VALIDATION ===

📤 === SENDING MESSAGE ===
Room ID: friend-xxx-xxx
Firebase UID: abc123...
MongoDB User ID: xyz789...
User Name: Your Name
Message: Hello
Firestore DB: Initialized
Creating messages collection reference...
✅ Messages collection reference created
Attempting to add document to Firestore...
✅ Message added to Firestore (local write)
   Document ID: doc123
📤 === MESSAGE SENT ===
```

## Step 2: Identify the Problem

### Problem A: Missing Validation Logs

**If you DON'T see the "🔍 PRE-SEND VALIDATION" logs:**
- The function isn't being called
- Check if the send button is working
- Check if there are JavaScript errors preventing the function from running

### Problem B: Missing Required Data

**If you see validation logs but something is MISSING:**
```
roomId: null  ← Problem!
userData: MISSING  ← Problem!
currentUser: MISSING  ← Problem!
db: NOT INITIALIZED  ← Problem!
```

**Solutions:**
- **roomId is null**: Make sure you've selected a friend to chat with
- **userData is MISSING**: You're not logged in. Log out and log back in.
- **currentUser is MISSING**: Firebase auth isn't working. Check Firebase configuration.
- **db is NOT INITIALIZED**: Firestore isn't initialized. Check `client/src/config/firebase.js`

### Problem C: Error After "Attempting to add document..."

**If you see:**
```
Attempting to add document to Firestore...
❌ === ERROR SENDING MESSAGE ===
```

**Check the error code:**

#### Error: `permission-denied`
**Cause:** Firestore security rules are blocking the write.

**Solution:**
1. Go to Firebase Console → Firestore Database → Rules
2. Make sure rules are:
```javascript
match /chats/{roomId}/messages/{messageId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null 
    && request.resource.data.userId == request.auth.uid;
}
```
3. Click "Publish"
4. Make sure `userId` in your message = `currentUser.uid` (Firebase UID, not MongoDB ID)

#### Error: `failed-precondition`
**Cause:** Firestore index is missing.

**Solution:**
1. Check the error message - it will have a link to create the index
2. Click the link and create the index
3. Wait 1-2 minutes for index to build
4. Try sending again

#### Error: `Firestore is not initialized`
**Cause:** Firestore database isn't enabled or initialized.

**Solution:**
1. Go to Firebase Console → Firestore Database
2. If you see "Create database", click it and enable Firestore
3. If database exists, check if it's in the correct project
4. Restart your React app

#### Error: `Network error` or `unavailable`
**Cause:** No internet connection or Firestore is down.

**Solution:**
1. Check your internet connection
2. Check Firebase status: https://status.firebase.google.com/
3. Try again in a few minutes

### Problem D: No Error, But No Success Message

**If you see:**
```
Attempting to add document to Firestore...
   This may take a moment...
```

**But nothing happens after that:**
- The `addDoc` call is hanging (not completing)
- This could be:
  1. Network timeout
  2. Firestore is not responding
  3. Security rules are silently blocking (check Network tab in DevTools)

**Solution:**
1. Check Network tab in DevTools
2. Look for requests to `firestore.googleapis.com`
3. Check if they're failing or timing out
4. Check Firestore security rules again

## Step 3: Verify Firestore Setup

Make sure you've completed all these steps:

- [ ] Firestore is enabled in Firebase Console
- [ ] Security rules are set and published
- [ ] You're logged in (check `currentUser` in console)
- [ ] Firebase config is correct in `client/.env`
- [ ] You've selected a friend to chat with (roomId exists)

## Step 4: Check Network Tab

1. Open DevTools → Network tab
2. Filter by "firestore" or "googleapis"
3. Try sending a message
4. Look for:
   - **POST requests** to `firestore.googleapis.com` (writing messages)
   - **GET requests** to `firestore.googleapis.com` (reading messages)
   - Check if they're **200 OK** or showing errors

## Step 5: Test Firestore Connection

Add this to your browser console to test Firestore:

```javascript
// Test Firestore connection
import { db } from './src/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Test write
const testRef = collection(db, 'test', 'test-room', 'messages');
addDoc(testRef, {
  text: 'Test message',
  userId: 'test-user',
  createdAt: serverTimestamp()
}).then(doc => {
  console.log('✅ Test message sent:', doc.id);
}).catch(err => {
  console.error('❌ Test failed:', err);
});
```

## Common Issues and Quick Fixes

### Issue: "db is NOT INITIALIZED"
**Fix:** Restart your React app. Make sure `client/src/config/firebase.js` is correct.

### Issue: "currentUser is MISSING"
**Fix:** 
1. Log out and log back in
2. Check Firebase Authentication is working
3. Check `client/.env` has correct Firebase config

### Issue: "roomId is null"
**Fix:** 
1. Make sure you've selected a friend from the friend list
2. Check that `handleSelectFriend` is being called
3. Check console for errors when selecting a friend

### Issue: "permission-denied" error
**Fix:**
1. Go to Firebase Console → Firestore → Rules
2. Copy the exact rules from `FIRESTORE_SETUP.md`
3. Make sure `userId` in message = Firebase Auth UID (not MongoDB ID)
4. Publish rules

## Still Not Working?

If none of these help, please provide:

1. **All console logs** from when you try to send a message
2. **Network tab screenshot** showing Firestore requests
3. **Firebase Console screenshot** showing:
   - Firestore Database → Data tab
   - Firestore Database → Rules tab
4. **Your Firestore security rules** (copy-paste them)

This will help identify the exact issue!


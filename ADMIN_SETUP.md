# Admin Account Setup Guide

This guide explains how to create an admin account for Campus Connect.

## Method 1: Using the API Endpoint (Recommended)

### Step 1: Get Your User ID
1. Log in to the application
2. Go to your profile page
3. The URL will be something like `/profile/690f47d649f7e352c12fddd0`
4. Copy the user ID (the part after `/profile/`)

### Step 2: Create Admin Account
Make a POST request to the `/api/auth/create-admin` endpoint:

**Using cURL:**
```bash
curl -X POST https://your-backend-url.onrender.com/api/auth/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID_HERE",
    "adminSecret": "campus-connect-admin-2024"
  }'
```

**Using Postman or similar:**
- Method: POST
- URL: `https://your-backend-url.onrender.com/api/auth/create-admin`
- Headers: `Content-Type: application/json`
- Body:
```json
{
  "userId": "YOUR_USER_ID_HERE",
  "adminSecret": "campus-connect-admin-2024"
}
```

**Alternative: Using Email**
If you prefer to use your email instead:
```json
{
  "email": "your-email@example.com",
  "adminSecret": "campus-connect-admin-2024"
}
```

### Step 3: Verify Admin Status
1. Log out and log back in
2. You should now see a "+" button in the navbar (for creating events)
3. Visit `/create-event` to create events

## Method 2: Using Environment Variable (For Production)

For production, set a custom admin secret in your environment variables:

1. Go to your Render dashboard
2. Navigate to your backend service
3. Go to Environment variables
4. Add: `ADMIN_SECRET` = `your-secret-key-here`
5. Use this secret when creating admin accounts

## Security Notes

- The default admin secret is `campus-connect-admin-2024`
- **Change this in production** by setting the `ADMIN_SECRET` environment variable
- Only users who know the secret can create admin accounts
- Admin accounts can create, edit, and delete events
- Regular users cannot create events

## Admin Features

Once you're an admin, you can:
- ✅ Create new events via `/create-event`
- ✅ Access the "Create Event" button in the navbar
- ✅ All events created by admins appear in the Events Discovery page

## Troubleshooting

**"Invalid admin secret" error:**
- Make sure you're using the correct secret
- Check if `ADMIN_SECRET` environment variable is set (it overrides the default)

**"User not found" error:**
- Make sure the user ID or email is correct
- The user must exist in the database (sign up first)

**Admin button not showing:**
- Log out and log back in to refresh your session
- Check that your user role is set to "admin" in the database


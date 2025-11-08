<<<<<<< HEAD
# Campus-Connect
=======
# Campus Connect - The Ultimate Student Collaboration Hub

A full-stack web application that connects students across colleges, enabling them to find peers with complementary skills, form project teams, and collaborate effectively on shared interests.

## Features

### Core Features
- **User Authentication**: Secure signup and login using Firebase Authentication
- **Profile Management**: Customizable student profiles with skills, interests, and portfolio links
- **Project & Idea Posting**: Post project ideas with descriptions, tags, and required skills
- **Community Interaction**: Comments, upvotes, and bookmarks on project posts
- **Event Discovery**: Curated section featuring hackathons, workshops, and student events
- **Real-Time Chat**: WebSocket-based chat for project collaboration

### Additional Features
- **Team Matchmaking**: Request to join projects and manage team members
- **Recommendations**: AI-powered project and user recommendations based on skills and interests
- **Search & Filters**: Advanced search and filtering for projects and events

## Tech Stack

### Frontend
- React 18
- React Router DOM
- Firebase Authentication
- Socket.io Client
- React Icons
- React Hot Toast
- Axios
- Date-fns

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.io (WebSockets)
- Firebase Admin SDK

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd campus-connect
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**

   Create `server/.env`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/campus-connect
   CLIENT_URL=http://localhost:3000
   ```

   Create `client/.env`:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
   REACT_APP_FIREBASE_PROJECT_ID=your-firebase-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-firebase-messaging-sender-id
   REACT_APP_FIREBASE_APP_ID=your-firebase-app-id
   ```

4. **Set up Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Email/Password authentication
   - Copy your Firebase configuration to `client/.env`

5. **Set up MongoDB**
   - Install MongoDB locally or use MongoDB Atlas
   - Update `MONGODB_URI` in `server/.env`

6. **Run the application**
   ```bash
   npm run dev
   ```

   This will start both the backend server (port 5000) and frontend (port 3000).

## Project Structure

```
campus-connect/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context providers
│   │   ├── config/        # Configuration files
│   │   └── App.js
│   └── package.json
├── server/                 # Node.js backend
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── index.js           # Server entry point
│   └── package.json
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/verify` - Verify Firebase token and create/update user

### Users
- `GET /api/users/:id` - Get user profile
- `GET /api/users/uid/:uid` - Get user by Firebase UID
- `PUT /api/users/:id` - Update user profile
- `GET /api/users/search/:query` - Search users
- `GET /api/users/recommendations/:userId` - Get recommended users

### Projects
- `GET /api/projects` - Get all projects (with filters)
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get single project
- `PUT /api/projects/:id` - Update project
- `POST /api/projects/:id/request` - Request to join project
- `POST /api/projects/:id/request/:requestId` - Accept/reject join request
- `POST /api/projects/:id/upvote` - Upvote project
- `POST /api/projects/:id/bookmark` - Bookmark project
- `GET /api/projects/recommendations/:userId` - Get recommended projects

### Comments
- `POST /api/comments` - Create comment
- `GET /api/comments/project/:projectId` - Get comments for project
- `POST /api/comments/:id/upvote` - Upvote comment
- `POST /api/comments/:id/reply` - Reply to comment

### Events
- `GET /api/events` - Get all events (with filters)
- `POST /api/events` - Create event
- `GET /api/events/:id` - Get single event
- `POST /api/events/:id/join` - Join event
- `POST /api/events/:id/leave` - Leave event

## WebSocket Events

### Client to Server
- `join-room` - Join a chat room
- `leave-room` - Leave a chat room
- `send-message` - Send a message

### Server to Client
- `receive-message` - Receive a new message

## Usage

1. **Sign Up**: Create an account with your email and password
2. **Complete Profile**: Add your college, branch, skills, and interests
3. **Explore Projects**: Browse projects or create your own
4. **Join Projects**: Request to join projects that interest you
5. **Collaborate**: Use the chat feature to communicate with team members
6. **Discover Events**: Find and join hackathons and workshops

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.

>>>>>>> 4b26555 (Initial commit of existing project)

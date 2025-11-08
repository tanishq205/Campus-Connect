import { StreamChat } from 'stream-chat';

// Stream Chat configuration
// Get your API key from: https://dashboard.getstream.io/
const STREAM_API_KEY = process.env.REACT_APP_STREAM_API_KEY || '';

if (!STREAM_API_KEY || STREAM_API_KEY === 'your-stream-api-key-here') {
  console.warn('⚠️ Stream Chat API key is missing!');
  console.warn('Please add REACT_APP_STREAM_API_KEY to your .env file');
  console.warn('Get your API key from: https://dashboard.getstream.io/');
}

// Initialize Stream Chat client
export const streamClient = StreamChat.getInstance(STREAM_API_KEY);

export default streamClient;


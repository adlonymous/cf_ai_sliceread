# Cerebras Document Chatbot

A Next.js application that provides document-specific chat functionality using the Cerebras AI API. Users can select documents and have intelligent conversations about their content.

## Features

- **Document-Specific Chat Sessions**: Each document has its own isolated chat session
- **Cerebras AI Integration**: Powered by Cerebras' fast inference capabilities
- **Real-time Chat Interface**: Modern, responsive chat UI with message history
- **Document Management**: Browse and select from available documents
- **Session Persistence**: Chat history is maintained during the session
- **Database Integration**: Can connect to your existing document database

## Prerequisites

- Node.js 18+ 
- A Cerebras API key
- (Optional) Your document database running

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   
   Create a `.env.local` file in the web directory:
   ```env
   CEREBRAS_API_KEY=your_cerebras_api_key_here
   NEXT_PUBLIC_WORKER_API=http://localhost:8787
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```

4. **Open the Application**
   
   Navigate to `http://localhost:3000` in your browser.

## Usage

### Basic Chat Flow

1. **Select a Document**: Choose from the available documents in the left sidebar
2. **Start Chatting**: Type your questions in the input field at the bottom
3. **View Responses**: The AI will respond based on the document content
4. **Clear Session**: Use the "Clear Chat" button to start a new conversation

### API Endpoints

#### Chat API (`/api/chat`)

- **POST**: Send a message to the chatbot
  ```json
  {
    "message": "What is this document about?",
    "documentId": "document-123",
    "sessionId": "session-456"
  }
  ```

- **GET**: Retrieve chat history
  ```
  GET /api/chat?documentId=document-123&sessionId=session-456
  ```

- **DELETE**: Clear chat session
  ```
  DELETE /api/chat?documentId=document-123&sessionId=session-456
  ```

#### Documents API (`/api/documents`)

- **GET**: Retrieve available documents
  ```
  GET /api/documents?textbook=blockchain&search=consensus
  ```

## Architecture

### Frontend Components

- **`/app/page.tsx`**: Landing page with feature overview
- **`/app/chat/page.tsx`**: Main chat interface
- **`/app/layout.tsx`**: Navigation and layout wrapper

### API Routes

- **`/app/api/chat/route.ts`**: Chat functionality and session management
- **`/app/api/documents/route.ts`**: Document retrieval and filtering

### Key Features

1. **Session Management**: Each document-session combination has isolated chat history
2. **Cerebras Integration**: Uses the official Cerebras Cloud SDK
3. **Responsive Design**: Works on desktop and mobile devices
4. **Error Handling**: Graceful fallbacks and user-friendly error messages

## Database Integration

The application can integrate with your existing document database:

1. **Worker API**: Connect to your Cloudflare Worker API
2. **Direct Database**: Modify the documents API to query your database directly
3. **Mock Data**: Falls back to mock data if database is unavailable

## Customization

### Adding New Documents

Update the mock data in `/app/api/documents/route.ts` or connect to your database.

### Styling

The application uses Tailwind CSS. Modify the classes in the components to change the appearance.

### AI Model

Change the model in `/app/api/chat/route.ts`:
```typescript
model: 'llama-4-scout-17b-16e-instruct', // Change this
```

## Troubleshooting

### Common Issues

1. **API Key Error**: Ensure your Cerebras API key is correctly set in `.env.local`
2. **No Documents**: Check if the documents API is returning data
3. **Chat Not Working**: Verify the Cerebras API is accessible and the model is available

### Debug Mode

Enable debug logging by adding to your environment:
```env
NODE_ENV=development
```

## Production Deployment

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm start
   ```

3. **Environment Variables**: Ensure all environment variables are set in production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
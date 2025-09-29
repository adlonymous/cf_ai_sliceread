import { NextRequest, NextResponse } from 'next/server';
import Cerebras from '@cerebras/cerebras_cloud_sdk';

// Initialize Cerebras client
const client = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY,
});

// In-memory storage for chat sessions (in production, use a database)
const chatSessions = new Map<string, Array<{ role: string; content: string }>>();

export async function POST(request: NextRequest) {
  try {
    const { message, textbookId, sessionId } = await request.json();

    if (!message || !textbookId) {
      return NextResponse.json(
        { error: 'Message and textbookId are required' },
        { status: 400 }
      );
    }

    // Create a unique session key combining textbookId and sessionId
    const sessionKey = `${textbookId}-${sessionId || 'default'}`;

    // Get or create chat history for this session
    if (!chatSessions.has(sessionKey)) {
      chatSessions.set(sessionKey, []);
    }

    const chatHistory = chatSessions.get(sessionKey)!;

    // Add user message to history
    chatHistory.push({ role: 'user', content: message });

    // Fetch textbook details to get description
    let textbookDescription = '';
    try {
      const workerUrl = process.env.NEXT_PUBLIC_WORKER_API || 'http://localhost:8787';
      const textbookResponse = await fetch(`${workerUrl}/textbook/${textbookId}`);
      
      if (textbookResponse.ok) {
        const textbookData = await textbookResponse.json();
        textbookDescription = textbookData.textbook?.description || '';
      }
    } catch (error) {
      console.log('Could not fetch textbook details, using basic context');
    }

    // Create system message with textbook context including description
    const systemMessage = {
      role: 'system',
      content: `You are a helpful assistant that answers questions about a specific textbook. 
      The textbook ID is: ${textbookId}
      ${textbookDescription ? `The textbook description is: ${textbookDescription}` : ''}
      
      Please provide accurate, helpful responses based on the textbook content and description. 
      If you cannot find relevant information in the textbook, please say so clearly.
      
      Keep your responses concise and focused on the textbook content.`
    };

    // Prepare messages for Cerebras API
    const messages = [systemMessage, ...chatHistory];

    // Call Cerebras API
    const completion = await client.chat.completions.create({
      messages,
      model: 'llama-4-scout-17b-16e-instruct',
      max_tokens: 1000,
      temperature: 0.7,
    });

    const assistantMessage = completion.choices[0].message.content;

    // Add assistant response to history
    chatHistory.push({ role: 'assistant', content: assistantMessage });

    // Keep only last 20 messages to prevent context overflow
    if (chatHistory.length > 20) {
      chatHistory.splice(0, chatHistory.length - 20);
    }

    return NextResponse.json({
      message: assistantMessage,
      sessionId: sessionId || 'default',
      textbookId,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const textbookId = searchParams.get('textbookId');
  const sessionId = searchParams.get('sessionId') || 'default';

  if (!textbookId) {
    return NextResponse.json(
      { error: 'TextbookId is required' },
      { status: 400 }
    );
  }

  const sessionKey = `${textbookId}-${sessionId}`;
  const chatHistory = chatSessions.get(sessionKey) || [];

  return NextResponse.json({
    messages: chatHistory,
    sessionId,
    textbookId,
  });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const textbookId = searchParams.get('textbookId');
  const sessionId = searchParams.get('sessionId') || 'default';

  if (!textbookId) {
    return NextResponse.json(
      { error: 'TextbookId is required' },
      { status: 400 }
    );
  }

  const sessionKey = `${textbookId}-${sessionId}`;
  chatSessions.delete(sessionKey);

  return NextResponse.json({
    message: 'Chat session cleared',
    sessionId,
    textbookId,
  });
}

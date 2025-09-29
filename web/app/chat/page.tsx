'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MessageCircle, Send, Trash2, BookOpen, ArrowLeft, Loader2 } from 'lucide-react';

interface Textbook {
  id: number;
  slug: string;
  title: string;
  author?: string;
  description?: string;
  total_sections: number;
  created_at: string;
  updated_at: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const textbookSlug = searchParams.get('textbook');
  
  const [selectedTextbook, setSelectedTextbook] = useState<Textbook | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTextbook, setIsLoadingTextbook] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load textbook details when component mounts or textbookSlug changes
  useEffect(() => {
    if (textbookSlug) {
      fetchTextbookDetails(textbookSlug);
    }
  }, [textbookSlug]);

  // Load chat history when textbook changes
  useEffect(() => {
    if (selectedTextbook) {
      loadChatHistory();
    } else {
      setMessages([]);
    }
  }, [selectedTextbook, sessionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchTextbookDetails = async (slug: string) => {
    setIsLoadingTextbook(true);
    try {
      const workerUrl = process.env.NEXT_PUBLIC_WORKER_API || 'http://localhost:8787';
      
      // Try to get textbook details from worker
      const response = await fetch(`${workerUrl}/textbook/${slug}`);
      
      if (response.ok) {
        const data = await response.json();
        setSelectedTextbook(data.textbook);
      } else {
        // Fallback to mock data
        const mockTextbook: Textbook = {
          id: 1,
          slug: slug,
          title: 'Sample Textbook',
          author: 'Sample Author',
          description: 'This is a sample textbook for testing the chatbot functionality.',
          total_sections: 5,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };
        setSelectedTextbook(mockTextbook);
      }
    } catch (error) {
      console.error('Failed to fetch textbook details:', error);
      // Fallback to mock data
      const mockTextbook: Textbook = {
        id: 1,
        slug: slug,
        title: 'Sample Textbook',
        author: 'Sample Author',
        description: 'This is a sample textbook for testing the chatbot functionality.',
        total_sections: 5,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      setSelectedTextbook(mockTextbook);
    } finally {
      setIsLoadingTextbook(false);
    }
  };

  const loadChatHistory = async () => {
    if (!selectedTextbook) return;

    try {
      const response = await fetch(
        `/api/chat?textbookId=${selectedTextbook.slug}&sessionId=${sessionId}`
      );
      const data = await response.json();
      
      if (data.messages) {
        const formattedMessages = data.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(),
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedTextbook || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          textbookId: selectedTextbook.slug,
          sessionId,
        }),
      });

      const data = await response.json();

      if (data.message) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    if (!selectedTextbook) return;

    try {
      await fetch(
        `/api/chat?textbookId=${selectedTextbook.slug}&sessionId=${sessionId}`,
        { method: 'DELETE' }
      );
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Show loading state while fetching textbook
  if (isLoadingTextbook) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading textbook...</p>
        </div>
      </div>
    );
  }

  // Show error state if no textbook slug provided
  if (!textbookSlug) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Textbook Selected</h2>
          <p className="text-gray-600 mb-4">Please select a textbook to start chatting.</p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Textbook Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border h-[calc(100vh-8rem)] flex flex-col">
          {/* Chat Header */}
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-500" />
                </button>
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedTextbook ? selectedTextbook.title : 'Loading...'}
                  </h3>
                  {selectedTextbook && (
                    <p className="text-sm text-gray-500">
                      {selectedTextbook.author && `by ${selectedTextbook.author}`} • {selectedTextbook.total_sections} sections
                    </p>
                  )}
                </div>
              </div>
              {selectedTextbook && (
                <button
                  onClick={clearChat}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Chat
                </button>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!selectedTextbook ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 text-gray-300 animate-spin" />
                  <p>Loading textbook...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Start a conversation about this textbook</p>
                  <p className="text-sm mt-2 text-gray-400">
                    Ask questions about: {selectedTextbook.title}
                    {selectedTextbook.author && ` by ${selectedTextbook.author}`}
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                    <span className="text-gray-600">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {selectedTextbook && (
            <div className="border-t p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question about this textbook..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

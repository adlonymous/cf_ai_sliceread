'use client';

import { useState, useEffect } from "react";
import { BookOpen, Search, Loader2 } from "lucide-react";

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

export default function Home() {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [filteredTextbooks, setFilteredTextbooks] = useState<Textbook[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch textbooks from worker API on component mount
  useEffect(() => {
    fetchTextbooks();
  }, []);

  // Filter textbooks based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTextbooks(textbooks);
    } else {
      const filtered = textbooks.filter(textbook =>
        textbook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (textbook.author && textbook.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (textbook.description && textbook.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredTextbooks(filtered);
    }
  }, [searchQuery, textbooks]);

  // Fetch textbooks from worker API
  const fetchTextbooks = async () => {
    setIsLoading(true);
    try {
      const workerUrl = process.env.NEXT_PUBLIC_WORKER_API || 'http://localhost:8787';
      
      // Get all textbooks
      const textbooksResponse = await fetch(`${workerUrl}/admin/textbooks`);
      const textbooksData = await textbooksResponse.json();
      
      if (textbooksData.textbooks) {
        setTextbooks(textbooksData.textbooks);
        setFilteredTextbooks(textbooksData.textbooks);
      } else {
        throw new Error('No textbooks found');
      }
    } catch (error) {
      console.error('Error fetching textbooks:', error);
      // Fallback to mock data
      const mockTextbooks: Textbook[] = [
        {
          id: 1,
          slug: 'blockchain-fundamentals',
          title: 'Blockchain Fundamentals',
          author: 'Dr. Jane Smith',
          description: 'A comprehensive guide to blockchain technology, covering distributed ledgers, consensus mechanisms, and cryptographic principles.',
          total_sections: 5,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          slug: 'cryptocurrency-economics',
          title: 'Cryptocurrency Economics',
          author: 'Prof. John Doe',
          description: 'Understanding the economic principles behind cryptocurrencies, tokenomics, and decentralized finance.',
          total_sections: 3,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 3,
          slug: 'smart-contracts',
          title: 'Smart Contracts Development',
          author: 'Alice Johnson',
          description: 'Learn to build and deploy smart contracts on various blockchain platforms.',
          total_sections: 4,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];
      setTextbooks(mockTextbooks);
      setFilteredTextbooks(mockTextbooks);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextbookSelect = (textbook: Textbook) => {
    // Redirect to chat page with textbook slug
    window.location.href = `/chat?textbook=${textbook.slug}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Textbook Selection Modal */}
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Choose Textbook</h2>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search textbooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Textbooks List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading textbooks...</span>
            </div>
          ) : filteredTextbooks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {searchQuery ? 'No textbooks found matching your search.' : 'No textbooks available.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTextbooks.map((textbook) => (
                <button
                  key={textbook.id}
                  onClick={() => handleTextbookSelect(textbook)}
                  className="text-left p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-900 text-lg">
                      {textbook.title}
                    </h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {textbook.total_sections} sections
                    </span>
                  </div>
                  {textbook.author && (
                    <p className="text-sm text-gray-600 mb-2">by {textbook.author}</p>
                  )}
                  {textbook.description && (
                    <p className="text-sm text-gray-500 line-clamp-3">{textbook.description}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-xl">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {filteredTextbooks.length} textbook{filteredTextbooks.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

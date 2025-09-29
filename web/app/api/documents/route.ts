import { NextRequest, NextResponse } from 'next/server';

// Mock data for now - in production, this would fetch from your database
const mockDocuments = [
  {
    id: 'blockchain-fundamentals-001',
    title: 'Introduction to Blockchain Technology',
    summary: 'This section covers the basic concepts of blockchain technology, including distributed ledgers, consensus mechanisms, and cryptographic principles.',
    keywords: 'blockchain, distributed ledger, consensus, cryptography',
    textbook: 'Blockchain Fundamentals',
    sectionNumber: 1,
  },
  {
    id: 'blockchain-fundamentals-002',
    title: 'Cryptographic Hash Functions',
    summary: 'Deep dive into hash functions, their properties, and how they are used in blockchain systems for data integrity and security.',
    keywords: 'hash functions, cryptography, security, data integrity',
    textbook: 'Blockchain Fundamentals',
    sectionNumber: 2,
  },
  {
    id: 'blockchain-fundamentals-003',
    title: 'Consensus Mechanisms',
    summary: 'Exploration of different consensus mechanisms including Proof of Work, Proof of Stake, and their trade-offs.',
    keywords: 'consensus, proof of work, proof of stake, mining',
    textbook: 'Blockchain Fundamentals',
    sectionNumber: 3,
  },
  {
    id: 'crypto-economics-001',
    title: 'Token Economics and Incentives',
    summary: 'Understanding how tokens work in blockchain systems, economic incentives, and tokenomics design principles.',
    keywords: 'tokenomics, incentives, economics, tokens',
    textbook: 'Cryptocurrency Economics',
    sectionNumber: 1,
  },
  {
    id: 'crypto-economics-002',
    title: 'DeFi Protocols and Yield Farming',
    summary: 'Introduction to decentralized finance protocols, yield farming strategies, and liquidity provision mechanisms.',
    keywords: 'DeFi, yield farming, liquidity, protocols',
    textbook: 'Cryptocurrency Economics',
    sectionNumber: 2,
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const textbook = searchParams.get('textbook');
    const search = searchParams.get('search');

    // Try to fetch from the worker API first
    try {
      const workerUrl = process.env.NEXT_PUBLIC_WORKER_API || 'http://localhost:8787';
      const response = await fetch(`${workerUrl}/api/sections`);
      
      if (response.ok) {
        const data = await response.json();
        const documents = data.sections.map((section: any) => ({
          id: section.resource_id,
          title: section.title,
          summary: section.summary || 'No summary available',
          keywords: section.keywords || '',
          textbook: section.textbook_title || 'Unknown Textbook',
          sectionNumber: section.section_number || 1,
        }));

        let filteredDocuments = documents;

        // Filter by textbook if specified
        if (textbook) {
          filteredDocuments = filteredDocuments.filter((doc: any) => 
            doc.textbook.toLowerCase().includes(textbook.toLowerCase())
          );
        }

        // Search in title, summary, and keywords
        if (search) {
          const searchLower = search.toLowerCase();
          filteredDocuments = filteredDocuments.filter((doc: any) => 
            doc.title.toLowerCase().includes(searchLower) ||
            doc.summary.toLowerCase().includes(searchLower) ||
            doc.keywords.toLowerCase().includes(searchLower)
          );
        }

        return NextResponse.json({
          documents: filteredDocuments,
          total: filteredDocuments.length,
        });
      }
    } catch (workerError) {
      console.log('Worker API not available, using mock data:', workerError);
    }

    // Fallback to mock data
    let documents = [...mockDocuments];

    // Filter by textbook if specified
    if (textbook) {
      documents = documents.filter(doc => 
        doc.textbook.toLowerCase().includes(textbook.toLowerCase())
      );
    }

    // Search in title, summary, and keywords
    if (search) {
      const searchLower = search.toLowerCase();
      documents = documents.filter(doc => 
        doc.title.toLowerCase().includes(searchLower) ||
        doc.summary.toLowerCase().includes(searchLower) ||
        doc.keywords.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      documents,
      total: documents.length,
    });

  } catch (error) {
    console.error('Documents API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

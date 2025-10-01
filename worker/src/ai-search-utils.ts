import type { Env } from "./types";

/**
 * AI Search utilities for searching through PDF content
 */
export class AISearchUtils {
	constructor(private env: Env) {}

	/**
	 * Search for relevant content in PDFs using Cloudflare AI Search
	 */
	async searchPDFContent(
		query: string, 
		textbookSlug: string, 
		limit: number = 5
	): Promise<{
		results: Array<{
			resource_id: string;
			title: string;
			section_number: number;
			relevance_score: number;
			content_snippet: string;
			r2_url?: string;
			external_key?: string;
		}>;
		total_results: number;
	}> {
		try {
			// First, get all sections for the textbook
			const db = this.env.fractional_document_unlock;
			const sections = await db.prepare(`
				SELECT s.id, s.textbook_id, s.section_number, s.resource_id, s.title, 
				       s.pdf_blob, s.external_key, s.r2_key, s.r2_url,
				       s.currency_code, s.price_minor_units, s.mime_type, s.size_bytes,
				       s.sha256, s.word_count, s.summary, s.keywords,
				       s.created_at, s.updated_at, t.slug as textbook_slug
				FROM sections s
				JOIN textbooks t ON s.textbook_id = t.id
				WHERE t.slug = ?
				ORDER BY s.section_number
			`).bind(textbookSlug).all();

			if (!sections.results || sections.results.length === 0) {
				return { results: [], total_results: 0 };
			}

			// For each section, search through the PDF content
			const searchResults = [];
			
			for (const section of sections.results as any[]) {
				try {
					// Get PDF content based on storage method
					let pdfContent = '';
					
					// Use existing summary and keywords for search instead of PDF parsing
					// This is more efficient and reliable than trying to parse PDFs
					if (section.summary || section.keywords) {
						pdfContent = `${section.title}\n\n${section.summary || ''}\n\nKeywords: ${section.keywords || ''}`;
					} else if (section.r2_key) {
						// For R2 stored PDFs, we'll use the title and a note about the PDF
						pdfContent = `${section.title}\n\nThis section contains detailed PDF content. The full content is available in the PDF file.`;
					} else if (section.pdf_blob) {
						// For D1 stored PDFs, we'll use the title and a note about the PDF
						pdfContent = `${section.title}\n\nThis section contains detailed PDF content. The full content is available in the PDF file.`;
					} else if (section.external_key) {
						// For external storage
						pdfContent = `${section.title}\n\nThis section contains detailed content. The full content is available externally.`;
					}

					if (pdfContent) {
						// Use AI to search through the content
						const relevanceScore = await this.calculateRelevance(query, pdfContent);
						
						if (relevanceScore > 0.3) { // Threshold for relevance
							searchResults.push({
								resource_id: section.resource_id,
								title: section.title,
								section_number: section.section_number,
								relevance_score: relevanceScore,
								content_snippet: this.extractRelevantSnippet(query, pdfContent),
								r2_url: section.r2_url,
								external_key: section.external_key
							});
						}
					}
				} catch (error) {
					console.error(`Error searching section ${section.resource_id}:`, error);
					// Continue with other sections
				}
			}

			// Sort by relevance score and limit results
			searchResults.sort((a, b) => b.relevance_score - a.relevance_score);
			const limitedResults = searchResults.slice(0, limit);

			return {
				results: limitedResults,
				total_results: searchResults.length
			};

		} catch (error) {
			console.error('AI Search error:', error);
			return { results: [], total_results: 0 };
		}
	}

	/**
	 * Extract text from PDF ArrayBuffer using Cloudflare AI
	 */
	private async extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
		try {
			// Convert ArrayBuffer to base64 for AI processing
			const uint8Array = new Uint8Array(arrayBuffer);
			let binary = '';
			for (let i = 0; i < uint8Array.length; i++) {
				binary += String.fromCharCode(uint8Array[i]);
			}
			const base64 = btoa(binary);

			// Use Cloudflare AI to extract text from PDF
			const response = await this.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
				messages: [
					{
						role: 'system',
						content: 'You are a PDF text extractor. Extract all readable text content from the provided PDF. Return only the text content, no explanations or formatting.'
					},
					{
						role: 'user',
						content: `Extract text from this PDF (base64): ${base64.substring(0, 10000)}...` // Limit size for AI processing
					}
				],
				max_tokens: 1500
			});

			return response.response || '';
		} catch (error) {
			console.error('PDF text extraction error:', error);
			// Fallback: return a basic description
			return `PDF content (${arrayBuffer.byteLength} bytes) - text extraction failed`;
		}
	}

	/**
	 * Calculate relevance score using AI
	 */
	private async calculateRelevance(query: string, content: string): Promise<number> {
		try {
			// Use Cloudflare AI to calculate relevance
			const response = await this.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
				messages: [
					{
						role: 'system',
						content: `You are a relevance scorer. Given a query and content, return a relevance score between 0 and 1. 
						Return only the number, no explanation.
						Query: "${query}"
						Content: "${content.substring(0, 1000)}..."`
					}
				]
			});

			const score = parseFloat(response.response || '0');
			return Math.max(0, Math.min(1, score));
		} catch (error) {
			console.error('Relevance calculation error:', error);
			// Fallback to simple text matching
			const queryWords = query.toLowerCase().split(' ');
			const contentWords = content.toLowerCase().split(' ');
			const matches = queryWords.filter(word => contentWords.includes(word)).length;
			return matches / queryWords.length;
		}
	}

	/**
	 * Extract relevant snippet around the query
	 */
	private extractRelevantSnippet(query: string, content: string, snippetLength: number = 200): string {
		const queryIndex = content.toLowerCase().indexOf(query.toLowerCase());
		
		if (queryIndex === -1) {
			// If exact query not found, return beginning of content
			return content.substring(0, snippetLength) + '...';
		}

		const start = Math.max(0, queryIndex - snippetLength / 2);
		const end = Math.min(content.length, queryIndex + snippetLength / 2);
		
		let snippet = content.substring(start, end);
		
		if (start > 0) snippet = '...' + snippet;
		if (end < content.length) snippet = snippet + '...';
		
		return snippet;
	}

	/**
	 * Generate AI response based on search results
	 */
	async generateResponse(
		query: string,
		searchResults: Array<{
			resource_id: string;
			title: string;
			section_number: number;
			relevance_score: number;
			content_snippet: string;
			r2_url?: string;
			external_key?: string;
		}>,
		textbookTitle: string
	): Promise<{
		response: string;
		referenced_sections: Array<{
			resource_id: string;
			title: string;
			section_number: number;
			r2_url?: string;
			external_key?: string;
		}>;
	}> {
		try {
			// Prepare context from search results
			const context = searchResults.map(result => 
				`Section ${result.section_number}: ${result.title}\n${result.content_snippet}`
			).join('\n\n');

			const referencedSections = searchResults.map(result => ({
				resource_id: result.resource_id,
				title: result.title,
				section_number: result.section_number,
				r2_url: result.r2_url,
				external_key: result.external_key
			}));

			// Generate response using AI
			// Limit context length to prevent token overflow
			const maxContextLength = 3000; // Adjust based on model limits
			const truncatedContext = context.length > maxContextLength 
				? context.substring(0, maxContextLength) + "..."
				: context;

			const aiResponse = await this.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
				messages: [
					{
						role: 'system',
						content: `You are a helpful assistant for the textbook "${textbookTitle}". You will sound
                        like a human, and you will be very helpful and friendly. Don't sound like a robot or a textbook.
                        Don't say things like "According to the textbook", just go into the answer directly.
						Based on the search results provided, answer the user's question comprehensively. Always
                        ground your answers in the textbook answers from the search results provided. Do not invent new
                        chapters or sections. When referencing content, include the exact chapter and section name
                        if available. Begin with a 2-3 sentence summary of the answer, then expand with relevant
                        examples or chapter details. When describing multiple use cases, present them in a bulleted 
                        or numbered list for clarity. 
                        
                        When mentioning specific sections, use this format:
                        "To learn more about [topic], check out **Section [number]: [title]**"
                        
                        End by suggesting 1-2 specific follow-up questions the user might 
                        ask next, based on the material. Never speculate beyond the material provided`
					},
					{
						role: 'user',
						content: `Question: ${query}\n\nRelevant content from textbook:\n${truncatedContext}`
					}
				],
				max_tokens: 2000, // Increase token limit for longer responses
				temperature: 0.7, // Add some creativity while staying focused
				top_p: 0.9, // Nucleus sampling for better quality
				stream: false // Ensure we get the complete response
			});


			return {
				response: aiResponse.response || 'I apologize, but I couldn\'t generate a response at this time.',
				referenced_sections: referencedSections
			};

		} catch (error) {
			console.error('AI response generation error:', error);
			return {
				response: 'I apologize, but I encountered an error while processing your question. Please try again.',
				referenced_sections: []
			};
		}
	}
}

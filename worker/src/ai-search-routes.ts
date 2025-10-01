import type { Env } from "./types";
import { AISearchUtils } from "./ai-search-utils";
import { corsHeaders } from "./routes";

/**
 * Handle AI search endpoint for textbook content
 */
export async function handleAISearch(request: Request, env: Env): Promise<Response> {
	try {
		const url = new URL(request.url);
		const query = url.searchParams.get('q');
		const textbookSlug = url.searchParams.get('textbook');
		const limit = parseInt(url.searchParams.get('limit') || '5');

		if (!query) {
			return new Response(JSON.stringify({ error: 'Query parameter "q" is required' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		if (!textbookSlug) {
			return new Response(JSON.stringify({ error: 'Textbook parameter is required' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		const aiSearch = new AISearchUtils(env);
		const searchResults = await aiSearch.searchPDFContent(query, textbookSlug, limit);

		return new Response(JSON.stringify({
			success: true,
			query,
			textbook: textbookSlug,
			...searchResults
		}), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('AI Search error:', error);
		return new Response(JSON.stringify({
			error: 'AI Search failed',
			message: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

/**
 * Handle AI chat endpoint with search integration
 */
export async function handleAIChat(request: Request, env: Env): Promise<Response> {
	try {
		const body = await request.json() as {
			message: string;
			textbook_slug: string;
			session_id?: string;
		};

		if (!body.message || !body.textbook_slug) {
			return new Response(JSON.stringify({
				error: 'Message and textbook_slug are required'
			}), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		const aiSearch = new AISearchUtils(env);
		
		// Search for relevant content
		const searchResults = await aiSearch.searchPDFContent(
			body.message, 
			body.textbook_slug, 
			5
		);

		// Get textbook title for context
		const db = env.fractional_document_unlock;
		const textbook = await db.prepare(
			'SELECT title FROM textbooks WHERE slug = ?'
		).bind(body.textbook_slug).first();

		const textbookTitle = (textbook as any)?.title || body.textbook_slug;

		// Generate AI response
		const aiResponse = await aiSearch.generateResponse(
			body.message,
			searchResults.results,
			textbookTitle
		);

		return new Response(JSON.stringify({
			success: true,
			response: aiResponse.response,
			referenced_sections: aiResponse.referenced_sections,
			search_results_count: searchResults.total_results,
			session_id: body.session_id || 'default'
		}), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('AI Chat error:', error);
		return new Response(JSON.stringify({
			error: 'AI Chat failed',
			message: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

/**
 * Handle PDF retrieval for referenced sections
 */
export async function handlePDFRetrieval(request: Request, env: Env): Promise<Response> {
	try {
		const url = new URL(request.url);
		const resourceId = url.pathname.split('/')[3]; // /ai/pdf/:resource_id
		const userId = url.searchParams.get('user_id') || 'anonymous';

		if (!resourceId) {
			return new Response(JSON.stringify({ error: 'Resource ID is required' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Get section details
		const db = env.fractional_document_unlock;
		const section = await db.prepare(
			'SELECT * FROM sections WHERE resource_id = ?'
		).bind(resourceId).first();

		if (!section) {
			return new Response(JSON.stringify({ error: 'Section not found' }), {
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Check if user has access (you might want to implement payment checks here)
		// For now, we'll allow access to all sections
		const hasAccess = true; // Implement your access control logic here

		if (!hasAccess) {
			return new Response(JSON.stringify({
				error: 'Access denied',
				section: {
					resource_id: (section as any).resource_id,
					title: (section as any).title,
					currency_code: (section as any).currency_code,
					price_minor_units: (section as any).price_minor_units
				}
			}), {
				status: 402,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Check what type of content we have and handle accordingly
		const sectionData = section as any;
		
		if (sectionData.pdf_blob) {
			// Return PDF content directly from D1
			const binaryString = atob(sectionData.pdf_blob);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			
			return new Response(bytes.buffer, {
				headers: {
					...corsHeaders,
					'Content-Type': 'application/pdf',
					'Content-Disposition': `inline; filename="${sectionData.resource_id}.pdf"`,
					'Cache-Control': 'public, max-age=3600'
				}
			});
		} else if (sectionData.r2_url) {
			// Return R2 URL for client to fetch
			return new Response(JSON.stringify({
				success: true,
				access_granted: true,
				storage_method: 'r2',
				r2_url: sectionData.r2_url,
				resource_id: sectionData.resource_id,
				title: sectionData.title,
				section_number: sectionData.section_number
			}), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		} else if (sectionData.external_key) {
			// Return external key information
			return new Response(JSON.stringify({
				success: true,
				access_granted: true,
				storage_method: 'external',
				external_key: sectionData.external_key,
				resource_id: sectionData.resource_id,
				title: sectionData.title,
				section_number: sectionData.section_number
			}), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		} else {
			return new Response(JSON.stringify({ error: 'No content available for this section' }), {
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

	} catch (error) {
		console.error('PDF Retrieval error:', error);
		return new Response(JSON.stringify({
			error: 'PDF Retrieval failed',
			message: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

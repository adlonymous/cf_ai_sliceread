import type { Env } from "./types";
import type { MyDurableObject } from "./database";

// CORS headers
export const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Handle search endpoint
 */
export async function handleSearch(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const query = url.searchParams.get('q');
	const textbookSlug = url.searchParams.get('textbook');
	
	if (!query) {
		return new Response(JSON.stringify({ error: 'Query parameter "q" is required' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	const stub = env.MY_DURABLE_OBJECT.getByName("search") as unknown as MyDurableObject;
	const sections = await stub.searchSections(query, textbookSlug || undefined);
	
	return new Response(JSON.stringify({ sections }), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' }
	});
}

/**
 * Handle section metadata endpoint
 */
export async function handleSection(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const resourceId = url.pathname.split('/')[2];
	const userId = request.headers.get('X-User-ID') || 'anonymous';
	
	const stub = env.MY_DURABLE_OBJECT.getByName("section") as unknown as MyDurableObject;
	const section = await stub.getSection(resourceId);
	
	if (!section) {
		return new Response(JSON.stringify({ error: 'Section not found' }), {
			status: 404,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	// Check if user has access
	const hasAccess = await stub.hasUserAccess(userId, resourceId);
	
	if (!hasAccess) {
		// Return 402 Payment Required with section metadata
		return new Response(JSON.stringify({ 
			error: 'Payment required',
			section: {
				resource_id: section.resource_id,
				title: section.title,
				currency_code: section.currency_code,
				price_minor_units: section.price_minor_units,
				summary: section.summary,
				mime_type: section.mime_type,
				size_bytes: section.size_bytes
			}
		}), {
			status: 402,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	// Return section metadata (content will be served separately)
	return new Response(JSON.stringify({ 
		section: {
			...section,
			pdf_blob: undefined // Don't include blob in JSON response
		}
	}), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' }
	});
}

/**
 * Handle section content endpoint
 */
export async function handleSectionContent(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const resourceId = url.pathname.split('/')[2];
	const userId = url.searchParams.get('user_id') || 'anonymous';
	const isAdmin = url.searchParams.get('admin') === 'true';
	
	const stub = env.MY_DURABLE_OBJECT.getByName("content") as unknown as MyDurableObject;
	
	// Check if user has access (admin bypass)
	const hasAccess = isAdmin || await stub.hasUserAccess(userId, resourceId);
	if (!hasAccess) {
		return new Response(JSON.stringify({ error: 'Access denied' }), {
			status: 403,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	try {
		const content = await stub.getSectionContent(resourceId);
		
		if (content.content) {
			// Return PDF blob
			return new Response(content.content, {
				headers: {
					...corsHeaders,
					'Content-Type': content.mime_type,
					'Content-Disposition': `inline; filename="${resourceId}.pdf"`,
					'Cache-Control': 'public, max-age=3600'
				}
			});
		} else if (content.external_key) {
			// Return external key for client to fetch from storage
			return new Response(JSON.stringify({ 
				external_key: content.external_key,
				mime_type: content.mime_type
			}), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}
		
		// Fallback if no content is available
		return new Response(JSON.stringify({ error: 'No content available' }), {
			status: 404,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Content not available' }), {
			status: 404,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

/**
 * Handle payment recording endpoint
 */
export async function handlePayment(request: Request, env: Env): Promise<Response> {
	const body = await request.json() as {
		user_id: string;
		resource_id: string;
		currency_code: string;
		amount_minor_units: number;
		payment_method: string;
		facilitator_tx_id?: string;
	};

	const stub = env.MY_DURABLE_OBJECT.getByName("payment") as unknown as MyDurableObject;
	
	// Generate a transaction ID if not provided
	const transactionId = body.facilitator_tx_id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	
	await stub.recordPayment(
		body.user_id,
		body.resource_id,
		body.currency_code,
		body.amount_minor_units,
		transactionId
	);

	return new Response(JSON.stringify({ 
		success: true, 
		transaction_id: transactionId,
		message: 'Payment processed successfully'
	}), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' }
	});
}

/**
 * Handle user sections endpoint
 */
export async function handleUserSections(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const userId = url.pathname.split('/')[2];
	const textbookSlug = url.searchParams.get('textbook');
	
	const stub = env.MY_DURABLE_OBJECT.getByName("user") as unknown as MyDurableObject;
	const sections = await stub.getUserSections(
		userId, 
		textbookSlug || undefined
	);

	return new Response(JSON.stringify({ sections }), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' }
	});
}

/**
 * Handle user payments endpoint
 */
export async function handleUserPayments(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const userId = url.pathname.split('/')[2];
	const status = url.searchParams.get('status');
	
	const stub = env.MY_DURABLE_OBJECT.getByName("user") as unknown as MyDurableObject;
	const payments = await stub.getUserPayments(userId, status || undefined);

	return new Response(JSON.stringify({ payments }), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' }
	});
}

/**
 * Handle textbook info endpoint
 */
export async function handleTextbook(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const slug = url.pathname.split('/')[2];
	
	const stub = env.MY_DURABLE_OBJECT.getByName("textbook") as unknown as MyDurableObject;
	const textbook = await stub.getTextbook(slug);
	
	if (!textbook) {
		return new Response(JSON.stringify({ error: 'Textbook not found' }), {
			status: 404,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	return new Response(JSON.stringify({ textbook }), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' }
	});
}

/**
 * Handle textbook sections endpoint
 */
export async function handleTextbookSections(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const slug = url.pathname.split('/')[2];
	
	const stub = env.MY_DURABLE_OBJECT.getByName("textbook") as unknown as MyDurableObject;
	const sections = await stub.getTextbookSections(slug);

	return new Response(JSON.stringify({ sections }), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' }
	});
}

/**
 * Handle default/root endpoint
 */
export async function handleDefault(): Promise<Response> {
	return new Response(JSON.stringify({ 
		message: 'Fractional Document Unlock API (Refactored)',
		endpoints: [
			'GET /search?q=query&textbook=slug - Search sections',
			'GET /section/:resource_id - Get section metadata',
			'GET /section/:resource_id/content - Get section content (PDF)',
			'POST /payment - Record payment and grant access',
			'GET /user/:id/sections - Get user\'s accessible sections',
			'GET /user/:id/payments - Get user\'s payment history',
			'GET /textbook/:slug - Get textbook info',
			'GET /textbook/:slug/sections - Get all sections in textbook',
			'',
			'Admin Endpoints:',
			'POST /admin/upload - Upload PDF (filename: {section_number}_{title}.pdf)',
			'POST /admin/textbooks - Create new textbook',
			'GET /admin/textbooks - List all textbooks',
			'GET /admin/textbooks/:slug/sections - List sections for textbook'
		]
	}), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' }
	});
}

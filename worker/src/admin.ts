import type { Env } from "./types";
import { corsHeaders } from "./routes";

/**
 * Handle admin PDF upload endpoint
 * Uses separate textbook_slug and section_number parameters
 * Filename is used for title (with underscores converted to spaces)
 * Example: "Introduction_to_Blockchain.pdf" with textbook_slug="blockchain-fundamentals" and section_number=1
 */
export async function handleAdminUpload(request: Request, env: Env): Promise<Response> {
	try {
		// Parse multipart form data
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const textbookSlug = formData.get('textbook_slug') as string;
		const sectionNumber = parseInt(formData.get('section_number') as string) || 1;
		const currencyCode = 'USDC'; // Only USDC is supported
		const priceMinorUnits = parseInt(formData.get('price_minor_units') as string) || 1000;

		if (!file) {
			return new Response(JSON.stringify({ error: 'No PDF file provided' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		if (!textbookSlug) {
			return new Response(JSON.stringify({ error: 'textbook_slug is required' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Extract title from filename (remove extension and clean up)
		const filename = file.name;
		const title = filename.replace(/\.pdf$/i, '').replace(/_/g, ' ');

		// Get textbook ID
		const db = env.fractional_document_unlock;
		const textbookResult = await db.prepare(
			'SELECT id FROM textbooks WHERE slug = ?'
		).bind(textbookSlug).first();

		if (!textbookResult) {
			return new Response(JSON.stringify({ error: 'Textbook not found' }), {
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		const textbookId = (textbookResult as any).id;

		// Check file size (D1 has a ~1MB limit for BLOB storage)
		const arrayBuffer = await file.arrayBuffer();
		const sizeBytes = arrayBuffer.byteLength;
		
		// D1 BLOB size limit is approximately 1MB
		const MAX_BLOB_SIZE = 1024 * 1024; // 1MB
		
		if (sizeBytes > MAX_BLOB_SIZE) {
			return new Response(JSON.stringify({
				error: 'File too large',
				message: `File size (${(sizeBytes / 1024 / 1024).toFixed(2)}MB) exceeds the 1MB limit for direct storage. Please use a smaller file or implement external storage (R2).`,
				maxSize: MAX_BLOB_SIZE,
				actualSize: sizeBytes
			}), {
				status: 413, // Payload Too Large
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Convert file to base64 for small files
		const uint8Array = new Uint8Array(arrayBuffer);
		let binary = '';
		for (let i = 0; i < uint8Array.length; i++) {
			binary += String.fromCharCode(uint8Array[i]);
		}
		const base64 = btoa(binary);
		const sha256 = await crypto.subtle.digest('SHA-256', arrayBuffer);
		const sha256Hex = Array.from(new Uint8Array(sha256))
			.map(b => b.toString(16).padStart(2, '0'))
			.join('');

		// Generate resource ID
		const resourceId = `${textbookSlug}-${sectionNumber.toString().padStart(3, '0')}`;

		// Insert or update section
		await db.prepare(`
			INSERT OR REPLACE INTO sections (
				textbook_id,
				section_number,
				resource_id,
				title,
				pdf_blob,
				currency_code,
				price_minor_units,
				mime_type,
				size_bytes,
				sha256,
				summary,
				keywords
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			textbookId,
			sectionNumber,
			resourceId,
			title,
			base64,
			currencyCode,
			priceMinorUnits,
			'application/pdf',
			sizeBytes,
			sha256Hex,
			`Uploaded PDF section: ${title}`,
			`pdf, ${textbookSlug}, section-${sectionNumber}`
		).run();

		// Update full-text search index
		await db.prepare(`
			INSERT INTO sections_fts(sections_fts) VALUES('rebuild')
		`).run();

		return new Response(JSON.stringify({
			success: true,
			section: {
				resource_id: resourceId,
				title: title,
				section_number: sectionNumber,
				textbook_slug: textbookSlug,
				size_bytes: sizeBytes,
				sha256: sha256Hex,
				price_minor_units: priceMinorUnits,
				currency_code: currencyCode
			}
		}), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('Admin upload error:', error);
		return new Response(JSON.stringify({
			error: 'Upload failed',
			message: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

/**
 * Handle admin textbook creation
 */
export async function handleAdminCreateTextbook(request: Request, env: Env): Promise<Response> {
	try {
		const body = await request.json() as {
			slug: string;
			title: string;
			author?: string;
			description?: string;
		};

		const db = env.fractional_document_unlock;

		// Check if textbook already exists
		const existing = await db.prepare(
			'SELECT id FROM textbooks WHERE slug = ?'
		).bind(body.slug).first();

		if (existing) {
			return new Response(JSON.stringify({ error: 'Textbook with this slug already exists' }), {
				status: 409,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Create textbook
		const result = await db.prepare(`
			INSERT INTO textbooks (slug, title, author, description, total_sections)
			VALUES (?, ?, ?, ?, 0)
		`).bind(
			body.slug,
			body.title,
			body.author || null,
			body.description || null
		).run();

		return new Response(JSON.stringify({
			success: true,
			textbook: {
				id: result.meta.last_row_id,
				slug: body.slug,
				title: body.title,
				author: body.author,
				description: body.description
			}
		}), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('Create textbook error:', error);
		return new Response(JSON.stringify({
			error: 'Failed to create textbook',
			message: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

/**
 * Handle admin list textbooks
 */
export async function handleAdminListTextbooks(request: Request, env: Env): Promise<Response> {
	try {
		const db = env.fractional_document_unlock;
		const result = await db.prepare(`
			SELECT t.*, COUNT(s.id) as section_count
			FROM textbooks t
			LEFT JOIN sections s ON t.id = s.textbook_id
			GROUP BY t.id
			ORDER BY t.created_at DESC
		`).all();

		return new Response(JSON.stringify({
			textbooks: result.results
		}), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('List textbooks error:', error);
		return new Response(JSON.stringify({
			error: 'Failed to list textbooks',
			message: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

/**
 * Handle admin list sections for a textbook
 */
export async function handleAdminListSections(request: Request, env: Env): Promise<Response> {
	try {
		const url = new URL(request.url);
		const textbookSlug = url.pathname.split('/')[3];

		const db = env.fractional_document_unlock;
		const result = await db.prepare(`
			SELECT s.*, t.slug as textbook_slug
			FROM sections s
			JOIN textbooks t ON s.textbook_id = t.id
			WHERE t.slug = ?
			ORDER BY s.section_number
		`).bind(textbookSlug).all();

		return new Response(JSON.stringify({
			sections: result.results
		}), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('List sections error:', error);
		return new Response(JSON.stringify({
			error: 'Failed to list sections',
			message: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

import type { Env } from "./types";
import { corsHeaders } from "./routes";
import { R2Utils } from "./r2-utils";
import { StorageOptimizer } from "./storage-optimizer";

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

		// Check file size and determine storage method
		const arrayBuffer = await file.arrayBuffer();
		const sizeBytes = arrayBuffer.byteLength;
		
		// D1 BLOB size limit is approximately 1MB
		const MAX_BLOB_SIZE = 1024 * 1024; // 1MB
		
		// Generate resource ID
		const resourceId = `${textbookSlug}-${sectionNumber.toString().padStart(3, '0')}`;
		
		// Calculate SHA256 hash
		const sha256 = await crypto.subtle.digest('SHA-256', arrayBuffer);
		const sha256Hex = Array.from(new Uint8Array(sha256))
			.map(b => b.toString(16).padStart(2, '0'))
			.join('');

		let pdfBlob: string | null = null;
		let r2Key: string | null = null;
		let r2Url: string | null = null;

		if (sizeBytes <= MAX_BLOB_SIZE) {
			// Store in D1 as base64 for small files
			const uint8Array = new Uint8Array(arrayBuffer);
			let binary = '';
			for (let i = 0; i < uint8Array.length; i++) {
				binary += String.fromCharCode(uint8Array[i]);
			}
			pdfBlob = btoa(binary);
		} else {
			// Store in R2 for larger files
			const r2Utils = new R2Utils(env);
			const r2Result = await r2Utils.uploadPDF(file, resourceId, textbookSlug);
			r2Key = r2Result.r2Key;
			r2Url = r2Result.r2Url;
		}

		// Insert or update section
		await db.prepare(`
			INSERT OR REPLACE INTO sections (
				textbook_id,
				section_number,
				resource_id,
				title,
				pdf_blob,
				r2_key,
				r2_url,
				currency_code,
				price_minor_units,
				mime_type,
				size_bytes,
				sha256,
				summary,
				keywords
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			textbookId,
			sectionNumber,
			resourceId,
			title,
			pdfBlob,
			r2Key,
			r2Url,
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
				currency_code: currencyCode,
				storage_method: pdfBlob ? 'd1_blob' : 'r2_bucket',
				r2_url: r2Url
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

/**
 * Handle admin migration of PDFs from D1 to R2
 */
export async function handleAdminMigrateToR2(request: Request, env: Env): Promise<Response> {
	try {
		const db = env.fractional_document_unlock;
		const r2Utils = new R2Utils(env);
		
		// Get all sections with PDF blobs that don't have R2 keys
		const sections = await db.prepare(`
			SELECT id, resource_id, pdf_blob, textbook_id, title
			FROM sections 
			WHERE pdf_blob IS NOT NULL AND r2_key IS NULL
		`).all();

		const results = [];
		
		for (const section of sections.results as any[]) {
			try {
				// Convert base64 back to ArrayBuffer
				const binaryString = atob(section.pdf_blob);
				const bytes = new Uint8Array(binaryString.length);
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i);
				}
				
				// Create a File-like object for R2 upload
				const file = new File([bytes], `${section.resource_id}.pdf`, { type: 'application/pdf' });
				
				// Get textbook slug for R2 key generation
				const textbook = await db.prepare(
					'SELECT slug FROM textbooks WHERE id = ?'
				).bind(section.textbook_id).first();
				
				if (!textbook) {
					results.push({
						resource_id: section.resource_id,
						status: 'error',
						message: 'Textbook not found'
					});
					continue;
				}
				
				// Upload to R2
				const r2Result = await r2Utils.uploadPDF(file, section.resource_id, (textbook as any).slug);
				
				// Update section with R2 info
				await db.prepare(`
					UPDATE sections 
					SET r2_key = ?, r2_url = ?, pdf_blob = NULL
					WHERE id = ?
				`).bind(r2Result.r2Key, r2Result.r2Url, section.id).run();
				
				results.push({
					resource_id: section.resource_id,
					status: 'success',
					r2_key: r2Result.r2Key,
					r2_url: r2Result.r2Url
				});
				
			} catch (error) {
				results.push({
					resource_id: section.resource_id,
					status: 'error',
					message: error instanceof Error ? error.message : 'Unknown error'
				});
			}
		}
		
		return new Response(JSON.stringify({
			success: true,
			migrated_count: results.filter(r => r.status === 'success').length,
			error_count: results.filter(r => r.status === 'error').length,
			results
		}), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
		
	} catch (error) {
		console.error('Migration error:', error);
		return new Response(JSON.stringify({
			error: 'Migration failed',
			message: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

/**
 * Handle admin storage analysis
 */
export async function handleAdminStorageAnalysis(request: Request, env: Env): Promise<Response> {
	try {
		const optimizer = new StorageOptimizer(env);
		const analysis = await optimizer.analyzeStorage();
		const breakdown = await optimizer.getStorageBreakdown();

		return new Response(JSON.stringify({
			success: true,
			analysis,
			breakdown
		}), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('Storage analysis error:', error);
		return new Response(JSON.stringify({
			error: 'Storage analysis failed',
			message: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

/**
 * Handle admin storage optimization
 */
export async function handleAdminOptimizeStorage(request: Request, env: Env): Promise<Response> {
	try {
		const url = new URL(request.url);
		const thresholdMB = parseFloat(url.searchParams.get('threshold') || '0.5');
		
		const optimizer = new StorageOptimizer(env);
		const result = await optimizer.optimizeStorage(thresholdMB);

		return new Response(JSON.stringify({
			success: true,
			...result
		}), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('Storage optimization error:', error);
		return new Response(JSON.stringify({
			error: 'Storage optimization failed',
			message: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

/**
 * Handle admin cleanup of orphaned R2 objects
 */
export async function handleAdminCleanupOrphaned(request: Request, env: Env): Promise<Response> {
	try {
		const optimizer = new StorageOptimizer(env);
		const result = await optimizer.cleanupOrphanedR2Objects();

		return new Response(JSON.stringify({
			success: true,
			...result
		}), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('Cleanup error:', error);
		return new Response(JSON.stringify({
			error: 'Cleanup failed',
			message: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

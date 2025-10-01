import type { Env } from "./types";
import { R2Utils } from "./r2-utils";

/**
 * Storage optimization utilities
 */
export class StorageOptimizer {
	constructor(private env: Env) {}

	/**
	 * Analyze storage usage across D1 and R2
	 */
	async analyzeStorage(): Promise<{
		d1Blobs: { count: number; totalSize: number; avgSize: number };
		r2Objects: { count: number; totalSize: number; avgSize: number };
		recommendations: string[];
	}> {
		const db = this.env.fractional_document_unlock;
		const r2Utils = new R2Utils(this.env);

		// Analyze D1 blob storage
		const d1Stats = await db.prepare(`
			SELECT 
				COUNT(*) as count,
				SUM(size_bytes) as total_size,
				AVG(size_bytes) as avg_size
			FROM sections 
			WHERE pdf_blob IS NOT NULL
		`).first() as any;

		// Analyze R2 storage
		const r2Stats = await db.prepare(`
			SELECT 
				COUNT(*) as count,
				SUM(size_bytes) as total_size,
				AVG(size_bytes) as avg_size
			FROM sections 
			WHERE r2_key IS NOT NULL
		`).first() as any;

		const recommendations = [];
		
		if (d1Stats.count > 0) {
			const avgSizeMB = (d1Stats.avg_size || 0) / (1024 * 1024);
			if (avgSizeMB > 0.5) {
				recommendations.push(`Consider migrating D1 blobs to R2 (avg size: ${avgSizeMB.toFixed(2)}MB)`);
			}
		}

		if (r2Stats.count === 0 && d1Stats.count > 0) {
			recommendations.push("No R2 objects found. Consider migrating D1 blobs to R2 for better performance.");
		}

		return {
			d1Blobs: {
				count: d1Stats.count || 0,
				totalSize: d1Stats.total_size || 0,
				avgSize: d1Stats.avg_size || 0
			},
			r2Objects: {
				count: r2Stats.count || 0,
				totalSize: r2Stats.total_size || 0,
				avgSize: r2Stats.avg_size || 0
			},
			recommendations
		};
	}

	/**
	 * Get detailed storage breakdown by textbook
	 */
	async getStorageBreakdown(): Promise<Array<{
		textbook_slug: string;
		textbook_title: string;
		total_sections: number;
		d1_sections: number;
		r2_sections: number;
		external_sections: number;
		total_size: number;
		d1_size: number;
		r2_size: number;
	}>> {
		const db = this.env.fractional_document_unlock;

		const result = await db.prepare(`
			SELECT 
				t.slug as textbook_slug,
				t.title as textbook_title,
				COUNT(s.id) as total_sections,
				SUM(CASE WHEN s.pdf_blob IS NOT NULL THEN 1 ELSE 0 END) as d1_sections,
				SUM(CASE WHEN s.r2_key IS NOT NULL THEN 1 ELSE 0 END) as r2_sections,
				SUM(CASE WHEN s.external_key IS NOT NULL THEN 1 ELSE 0 END) as external_sections,
				SUM(s.size_bytes) as total_size,
				SUM(CASE WHEN s.pdf_blob IS NOT NULL THEN s.size_bytes ELSE 0 END) as d1_size,
				SUM(CASE WHEN s.r2_key IS NOT NULL THEN s.size_bytes ELSE 0 END) as r2_size
			FROM textbooks t
			LEFT JOIN sections s ON t.id = s.textbook_id
			GROUP BY t.id, t.slug, t.title
			ORDER BY total_size DESC
		`).all();

		return result.results as any[];
	}

	/**
	 * Clean up orphaned R2 objects (objects in R2 but not in database)
	 */
	async cleanupOrphanedR2Objects(): Promise<{
		checked: number;
		orphaned: number;
		cleaned: number;
		errors: string[];
	}> {
		const db = this.env.fractional_document_unlock;
		const r2Utils = new R2Utils(this.env);

		// Get all R2 keys from database
		const dbKeys = await db.prepare(`
			SELECT r2_key FROM sections WHERE r2_key IS NOT NULL
		`).all();

		const dbKeySet = new Set((dbKeys.results as any[]).map(r => r.r2_key));
		
		// List all objects in R2 bucket
		const r2Objects = await this.env.PDF_STORAGE.list();
		const orphanedKeys = r2Objects.objects
			.filter(obj => !dbKeySet.has(obj.key))
			.map(obj => obj.key);

		let cleaned = 0;
		const errors = [];

		// Delete orphaned objects
		for (const key of orphanedKeys) {
			try {
				await r2Utils.deletePDF(key);
				cleaned++;
			} catch (error) {
				errors.push(`Failed to delete ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}

		return {
			checked: r2Objects.objects.length,
			orphaned: orphanedKeys.length,
			cleaned,
			errors
		};
	}

	/**
	 * Optimize storage by migrating large D1 blobs to R2
	 */
	async optimizeStorage(thresholdMB: number = 0.5): Promise<{
		migrated: number;
		errors: string[];
		details: Array<{
			resource_id: string;
			status: 'success' | 'error';
			message?: string;
		}>;
	}> {
		const db = this.env.fractional_document_unlock;
		const r2Utils = new R2Utils(this.env);
		const thresholdBytes = thresholdMB * 1024 * 1024;

		// Find large D1 blobs
		const largeBlobs = await db.prepare(`
			SELECT s.id, s.resource_id, s.pdf_blob, s.textbook_id, s.title, t.slug as textbook_slug
			FROM sections s
			JOIN textbooks t ON s.textbook_id = t.id
			WHERE s.pdf_blob IS NOT NULL 
			AND s.size_bytes > ?
			AND s.r2_key IS NULL
		`).bind(thresholdBytes).all();

		const results = [];
		let migrated = 0;

		for (const section of largeBlobs.results as any[]) {
			try {
				// Convert base64 back to ArrayBuffer
				const binaryString = atob(section.pdf_blob);
				const bytes = new Uint8Array(binaryString.length);
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i);
				}
				
				// Create a File-like object for R2 upload
				const file = new File([bytes], `${section.resource_id}.pdf`, { type: 'application/pdf' });
				
				// Upload to R2
				const r2Result = await r2Utils.uploadPDF(file, section.resource_id, section.textbook_slug);
				
				// Update section with R2 info and clear D1 blob
				await db.prepare(`
					UPDATE sections 
					SET r2_key = ?, r2_url = ?, pdf_blob = NULL
					WHERE id = ?
				`).bind(r2Result.r2Key, r2Result.r2Url, section.id).run();
				
				results.push({
					resource_id: section.resource_id,
					status: 'success' as const
				});
				migrated++;
				
			} catch (error) {
				results.push({
					resource_id: section.resource_id,
					status: 'error' as const,
					message: error instanceof Error ? error.message : 'Unknown error'
				});
			}
		}

		return {
			migrated,
			errors: results.filter(r => r.status === 'error').map(r => r.message || 'Unknown error'),
			details: results
		};
	}
}

import type { Env } from "./types";

/**
 * Utility functions for R2 bucket operations
 */
export class R2Utils {
	constructor(private env: Env) {}

	/**
	 * Upload a PDF to R2 bucket
	 */
	async uploadPDF(
		file: File, 
		resourceId: string, 
		textbookSlug: string
	): Promise<{ r2Key: string; r2Url: string }> {
		const arrayBuffer = await file.arrayBuffer();
		const r2Key = `pdfs/${textbookSlug}/${resourceId}.pdf`;
		
		// Upload to R2
		await this.env.PDF_STORAGE.put(r2Key, arrayBuffer, {
			httpMetadata: {
				contentType: 'application/pdf',
				cacheControl: 'public, max-age=31536000', // 1 year cache
			},
			customMetadata: {
				resourceId,
				textbookSlug,
				originalName: file.name,
				uploadedAt: new Date().toISOString(),
			}
		});

		// Generate public URL
		const r2Url = `https://pub-${this.env.PDF_STORAGE.id}.r2.dev/${r2Key}`;
		
		return { r2Key, r2Url };
	}

	/**
	 * Get PDF from R2 bucket
	 */
	async getPDF(r2Key: string): Promise<{ content: ArrayBuffer; contentType: string } | null> {
		const object = await this.env.PDF_STORAGE.get(r2Key);
		
		if (!object) {
			return null;
		}

		const content = await object.arrayBuffer();
		const contentType = object.httpMetadata?.contentType || 'application/pdf';
		
		return { content, contentType };
	}

	/**
	 * Delete PDF from R2 bucket
	 */
	async deletePDF(r2Key: string): Promise<void> {
		await this.env.PDF_STORAGE.delete(r2Key);
	}

	/**
	 * Check if PDF exists in R2 bucket
	 */
	async exists(r2Key: string): Promise<boolean> {
		const object = await this.env.PDF_STORAGE.head(r2Key);
		return object !== null;
	}

	/**
	 * Get PDF metadata from R2 bucket
	 */
	async getMetadata(r2Key: string): Promise<{
		size: number;
		lastModified: Date;
		contentType: string;
		customMetadata: Record<string, string>;
	} | null> {
		const object = await this.env.PDF_STORAGE.head(r2Key);
		
		if (!object) {
			return null;
		}

		return {
			size: object.size,
			lastModified: object.uploaded,
			contentType: object.httpMetadata?.contentType || 'application/pdf',
			customMetadata: object.customMetadata || {}
		};
	}

	/**
	 * Generate a signed URL for private access (if needed)
	 * Note: This would require additional configuration for signed URLs
	 */
	async generateSignedUrl(r2Key: string, expiresIn: number = 3600): Promise<string> {
		// For now, we'll use public URLs
		// In production, you might want to implement signed URLs for private access
		return `https://pub-${this.env.PDF_STORAGE.id}.r2.dev/${r2Key}`;
	}
}

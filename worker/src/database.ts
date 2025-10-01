import { DurableObject } from "cloudflare:workers";
import type { Env, Section, Textbook, UserPayment, UserAccess } from "./types";

/** A Durable Object's behavior is defined in an exported Javascript class */
export class MyDurableObject extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	/**
	 * Search for sections based on user query using full-text search
	 * Only searches title, summary, and keywords (excludes PDF content)
	 */
	async searchSections(query: string, textbookSlug?: string): Promise<Section[]> {
		const db = this.env.fractional_document_unlock;
		
		let sql = `
			SELECT s.* FROM sections s
			JOIN sections_fts fts ON s.id = fts.rowid
			JOIN textbooks t ON s.textbook_id = t.id
			WHERE sections_fts MATCH ?
		`;
		const params: any[] = [query];
		
		if (textbookSlug) {
			sql += ` AND t.slug = ?`;
			params.push(textbookSlug);
		}
		
		sql += ` ORDER BY rank LIMIT 10`;
		
		const result = await db.prepare(sql).bind(...params).all();
		return result.results as unknown as Section[];
	}

	/**
	 * Get section details by resource_id
	 */
	async getSection(resourceId: string): Promise<Section | null> {
		const db = this.env.fractional_document_unlock;
		const result = await db.prepare(
			'SELECT * FROM sections WHERE resource_id = ?'
		).bind(resourceId).first();
		
		return result as Section | null;
	}

	/**
	 * Get section PDF content (blob, R2, or external reference)
	 */
	async getSectionContent(resourceId: string): Promise<{ content?: ArrayBuffer; external_key?: string; r2_url?: string; mime_type: string }> {
		const section = await this.getSection(resourceId);
		console.log('Section found:', !!section);
		console.log('Section pdf_blob exists:', !!section?.pdf_blob);
		console.log('Section mime_type:', section?.mime_type);
		
		if (!section) {
			throw new Error('Section not found');
		}

		if (section.pdf_blob) {
			console.log('Processing PDF blob, length:', section.pdf_blob.length);
			// Convert base64 string back to ArrayBuffer
			const binaryString = atob(section.pdf_blob as string);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			
			console.log('Returning PDF content, ArrayBuffer length:', bytes.buffer.byteLength);
			return {
				content: bytes.buffer,
				mime_type: section.mime_type
			};
		} else if (section.r2_url) {
			console.log('Returning R2 URL');
			return {
				r2_url: section.r2_url,
				mime_type: section.mime_type
			};
		} else if (section.external_key) {
			console.log('Returning external key');
			return {
				external_key: section.external_key,
				mime_type: section.mime_type
			};
		} else {
			console.log('No content available');
			throw new Error('No content available for this section');
		}
	}

	/**
	 * Check if user has access to a section by resource_id
	 */
	async hasUserAccess(userId: string, resourceId: string): Promise<boolean> {
		const db = this.env.fractional_document_unlock;
		const result = await db.prepare(
			'SELECT 1 FROM user_access WHERE user_id = ? AND resource_id = ?'
		).bind(userId, resourceId).first();
		
		return !!result;
	}

	/**
	 * Grant access to a section for a user
	 */
	async grantAccess(userId: string, resourceId: string): Promise<void> {
		const db = this.env.fractional_document_unlock;
		
		// Get textbook_id from section
		const section = await this.getSection(resourceId);
		if (!section) {
			throw new Error('Section not found');
		}
		
		// Insert access record
		await db.prepare(`
			INSERT OR IGNORE INTO user_access (user_id, resource_id, textbook_id)
			VALUES (?, ?, ?)
		`).bind(userId, resourceId, section.textbook_id).run();
	}

	/**
	 * Record a payment for a section
	 */
	async recordPayment(
		userId: string, 
		resourceId: string, 
		currencyCode: string,
		amountMinorUnits: number,
		facilitatorTxId: string
	): Promise<void> {
		const db = this.env.fractional_document_unlock;
		
		await db.prepare(`
			INSERT INTO user_payments (user_id, resource_id, currency_code, amount_minor_units, payment_status, facilitator_tx_id, paid_at)
			VALUES (?, ?, ?, ?, 'completed', ?, datetime('now'))
		`).bind(userId, resourceId, currencyCode, amountMinorUnits, facilitatorTxId).run();
		
		// Grant access after successful payment
		await this.grantAccess(userId, resourceId);
	}

	/**
	 * Get user's accessible sections
	 */
	async getUserSections(userId: string, textbookSlug?: string): Promise<Section[]> {
		const db = this.env.fractional_document_unlock;
		
		let sql = `
			SELECT s.* FROM sections s
			JOIN user_access ua ON s.resource_id = ua.resource_id
			JOIN textbooks t ON s.textbook_id = t.id
			WHERE ua.user_id = ?
		`;
		const params: any[] = [userId];
		
		if (textbookSlug) {
			sql += ` AND t.slug = ?`;
			params.push(textbookSlug);
		}
		
		sql += ` ORDER BY s.section_number`;
		
		const result = await db.prepare(sql).bind(...params).all();
		return result.results as unknown as Section[];
	}

	/**
	 * Get textbook by slug
	 */
	async getTextbook(slug: string): Promise<Textbook | null> {
		const db = this.env.fractional_document_unlock;
		const result = await db.prepare(
			'SELECT * FROM textbooks WHERE slug = ?'
		).bind(slug).first();
		
		return result as Textbook | null;
	}

	/**
	 * Get sections by textbook slug
	 */
	async getTextbookSections(textbookSlug: string): Promise<Section[]> {
		const db = this.env.fractional_document_unlock;
		const result = await db.prepare(`
			SELECT s.* FROM sections s
			JOIN textbooks t ON s.textbook_id = t.id
			WHERE t.slug = ?
			ORDER BY s.section_number
		`).bind(textbookSlug).all();
		
		return result.results as unknown as Section[];
	}

	/**
	 * Get user's payment history
	 */
	async getUserPayments(userId: string, status?: string): Promise<UserPayment[]> {
		const db = this.env.fractional_document_unlock;
		
		let sql = 'SELECT * FROM user_payments WHERE user_id = ?';
		const params: any[] = [userId];
		
		if (status) {
			sql += ' AND payment_status = ?';
			params.push(status);
		}
		
		sql += ' ORDER BY created_at DESC';
		
		const result = await db.prepare(sql).bind(...params).all();
		return result.results as unknown as UserPayment[];
	}
}

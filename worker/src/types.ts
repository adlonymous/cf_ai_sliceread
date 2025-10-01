// Types for our refactored database schema
export interface Env {
	MY_DURABLE_OBJECT: DurableObjectNamespace;
	fractional_document_unlock: D1Database;
	PDF_STORAGE: R2Bucket;
	AI: Ai;
	AI_SEARCH_API_TOKEN: string;
}

export interface Textbook {
	id: number;
	slug: string;
	title: string;
	author?: string;
	description?: string;
	total_sections: number;
	created_at: string;
	updated_at: string;
}

export interface Section {
	id: number;
	textbook_id: number;
	section_number: number;
	resource_id: string;
	title: string;
	pdf_blob?: string; // Base64 encoded string
	external_key?: string;
	r2_key?: string;
	r2_url?: string;
	currency_code: string;
	price_minor_units: number;
	mime_type: string;
	size_bytes?: number;
	sha256?: string;
	word_count?: number;
	summary?: string;
	keywords?: string;
	created_at: string;
	updated_at: string;
}

export interface UserPayment {
	id: number;
	user_id: string;
	resource_id: string;
	currency_code: string;
	amount_minor_units: number;
	payment_status: 'pending' | 'completed' | 'failed' | 'refunded' | 'expired';
	facilitator_tx_id?: string;
	paid_at?: string;
	created_at: string;
}

export interface UserAccess {
	id: number;
	user_id: string;
	resource_id: string;
	textbook_id: number;
	granted_at: string;
}

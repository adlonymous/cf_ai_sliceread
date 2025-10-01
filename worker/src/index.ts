import type { Env } from "./types";
import { MyDurableObject } from "./database";
import { 
	handleSearch, 
	handleSection, 
	handleSectionContent, 
	handlePayment, 
	handleUserSections, 
	handleUserPayments, 
	handleTextbook, 
	handleTextbookSections, 
	handleDefault,
	corsHeaders 
} from "./routes";
import {
	handleAdminUpload,
	handleAdminCreateTextbook,
	handleAdminListTextbooks,
	handleAdminListSections,
	handleAdminMigrateToR2,
	handleAdminStorageAnalysis,
	handleAdminOptimizeStorage,
	handleAdminCleanupOrphaned
} from "./admin";
import {
	handleAISearch,
	handleAIChat,
	handlePDFRetrieval
} from "./ai-search-routes";

export { MyDurableObject };

export default {
	/**
	 * This is the standard fetch handler for a Cloudflare Worker
	 * Handles the Fractional Document Unlock API endpoints
	 */
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		// Handle preflight requests
		if (method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: corsHeaders });
		}

		try {
			// Route: GET /search?q=query&textbook=slug
			if (path === '/search' && method === 'GET') {
				return await handleSearch(request, env);
			}

			// Route: GET /section/:resource_id
			if (path.startsWith('/section/') && method === 'GET' && !path.endsWith('/content')) {
				return await handleSection(request, env);
			}

			// Route: GET /section/:resource_id/content
			if (path.startsWith('/section/') && path.endsWith('/content') && method === 'GET') {
				return await handleSectionContent(request, env);
			}

			// Route: POST /payment
			if (path === '/payment' && method === 'POST') {
				return await handlePayment(request, env);
			}

			// Route: GET /user/:id/sections
			if (path.startsWith('/user/') && path.endsWith('/sections') && method === 'GET') {
				return await handleUserSections(request, env);
			}

			// Route: GET /user/:id/payments
			if (path.startsWith('/user/') && path.endsWith('/payments') && method === 'GET') {
				return await handleUserPayments(request, env);
			}

			// Route: GET /textbook/:slug
			if (path.startsWith('/textbook/') && method === 'GET' && !path.endsWith('/sections')) {
				return await handleTextbook(request, env);
			}

			// Route: GET /textbook/:slug/sections
			if (path.startsWith('/textbook/') && path.endsWith('/sections') && method === 'GET') {
				return await handleTextbookSections(request, env);
			}

			// Admin Routes
			// Route: POST /admin/upload
			if (path === '/admin/upload' && method === 'POST') {
				return await handleAdminUpload(request, env);
			}

			// Route: POST /admin/textbooks
			if (path === '/admin/textbooks' && method === 'POST') {
				return await handleAdminCreateTextbook(request, env);
			}

			// Route: GET /admin/textbooks
			if (path === '/admin/textbooks' && method === 'GET') {
				return await handleAdminListTextbooks(request, env);
			}

			// Route: GET /admin/textbooks/:slug/sections
			if (path.startsWith('/admin/textbooks/') && path.endsWith('/sections') && method === 'GET') {
				return await handleAdminListSections(request, env);
			}

			// Route: POST /admin/migrate-to-r2
			if (path === '/admin/migrate-to-r2' && method === 'POST') {
				return await handleAdminMigrateToR2(request, env);
			}

			// Route: GET /admin/storage-analysis
			if (path === '/admin/storage-analysis' && method === 'GET') {
				return await handleAdminStorageAnalysis(request, env);
			}

			// Route: POST /admin/optimize-storage
			if (path === '/admin/optimize-storage' && method === 'POST') {
				return await handleAdminOptimizeStorage(request, env);
			}

			// Route: POST /admin/cleanup-orphaned
			if (path === '/admin/cleanup-orphaned' && method === 'POST') {
				return await handleAdminCleanupOrphaned(request, env);
			}

			// AI Search Routes
			// Route: GET /ai/search?q=query&textbook=slug
			if (path === '/ai/search' && method === 'GET') {
				return await handleAISearch(request, env);
			}

			// Route: POST /ai/chat
			if (path === '/ai/chat' && method === 'POST') {
				return await handleAIChat(request, env);
			}

			// Route: GET /ai/pdf/:resource_id
			if (path.startsWith('/ai/pdf/') && method === 'GET') {
				return await handlePDFRetrieval(request, env);
			}

			// Default route
			return await handleDefault();

		} catch (error) {
			console.error('Error:', error);
			return new Response(JSON.stringify({ 
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error'
			}), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}
	},
} satisfies ExportedHandler<Env>;
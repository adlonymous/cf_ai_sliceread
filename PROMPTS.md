```
@Cloudflare D1 @Cloudflare Workers Okay, now I'm building an app that is basically this

Fractional Document Unlock - users chat with an agent - llm parses query and finds the most relevant section in the document - server issues an x402 Payment required only for that section - once paid, content is released - state is tracked so, user can always have access to it

Now, I want to set up the database using D1 where I'll store a textbook in a table, and each section will be in a row of the database. 
```

```
Refactor the D1 schema for the Fractional Document Unlock app with these changes:

- Use a `pdf_blob BLOB` column (or optional `external_key TEXT`) for storing section PDFs instead of `content TEXT`.
- Add fields on `sections`: `resource_id TEXT UNIQUE`, `currency_code TEXT`, `price_minor_units INTEGER`, `mime_type`, `size_bytes`, `sha256`.
- Keep `summary` and `keywords` for previews/search, but limit FTS to `title, summary, keywords` only (no raw PDFs).
- Add `slug TEXT UNIQUE` to `textbooks` for stable external IDs.
- Update `user_payments` to use `resource_id`, `currency_code`, `amount_minor_units`, `payment_status` with CHECK, `facilitator_tx_id`, `paid_at`.
- Enforce `UNIQUE(user_id, resource_id)` on `user_payments`.
- Drop or make `user_access` optional (prefer KV for entitlements).
- Ensure composite indexes on `(textbook_id, section_number)` and `(user_id, payment_status)`.
```

```
keep updating the database commands I can use to DATABASE.md
```

```
ok, I'll build an admin page on the web to upload the pdfs but create a route for that. I'll upload different pdfs that are prefixed in a certain way to denote which section it is. S0 will be everything before that
```

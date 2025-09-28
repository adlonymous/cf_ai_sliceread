-- Sample data for the refactored Fractional Document Unlock app
-- This migration adds sample textbook and section data with the new schema

-- Insert sample textbook with slug
INSERT INTO textbooks (slug, title, author, description, total_sections) VALUES 
('blockchain-fundamentals', 'Introduction to Blockchain Technology', 'Dr. Sarah Chen', 'A comprehensive guide to understanding blockchain fundamentals, cryptography, and distributed systems.', 5);

-- Insert sample sections with new schema
INSERT INTO sections (
    textbook_id, 
    section_number, 
    resource_id, 
    title, 
    external_key, 
    currency_code, 
    price_minor_units, 
    mime_type, 
    size_bytes, 
    sha256, 
    word_count, 
    summary, 
    keywords
) VALUES 
(1, 1, 'blockchain-fundamentals-001', 'What is Blockchain?', 
's3://fractional-docs/blockchain-fundamentals/section-001.pdf',
'USDC', 1000, 'application/pdf', 245760, 
'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890',
150, 
'Introduction to blockchain technology, its core concepts, and historical context including Satoshi Nakamoto and bitcoin.',
'blockchain, distributed ledger, cryptography, bitcoin, satoshi nakamoto, double-spending'),

(1, 2, 'blockchain-fundamentals-002', 'Cryptographic Foundations', 
's3://fractional-docs/blockchain-fundamentals/section-002.pdf',
'USDC', 1500, 'application/pdf', 312000,
'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890a1',
200,
'Deep dive into cryptographic concepts essential for blockchain: hash functions, digital signatures, Merkle trees, and public key cryptography.',
'cryptography, hash functions, SHA-256, digital signatures, Merkle trees, public key, private key'),

(1, 3, 'blockchain-fundamentals-003', 'Consensus Mechanisms', 
's3://fractional-docs/blockchain-fundamentals/section-003.pdf',
'USDC', 2000, 'application/pdf', 384000,
'c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890a1b2',
250,
'Comprehensive overview of consensus mechanisms including PoW, PoS, DPoS, and PBFT, with their trade-offs and use cases.',
'consensus, proof of work, proof of stake, mining, validators, Byzantine fault tolerance, PBFT'),

(1, 4, 'blockchain-fundamentals-004', 'Smart Contracts and DApps', 
's3://fractional-docs/blockchain-fundamentals/section-004.pdf',
'USDC', 1800, 'application/pdf', 356000,
'd4e5f6789012345678901234567890abcdef1234567890abcdef1234567890a1b2c3',
220,
'Introduction to smart contracts and decentralized applications, their characteristics, and popular development platforms.',
'smart contracts, DApps, decentralized applications, Ethereum, Solana, Cardano, immutable, transparent'),

(1, 5, 'blockchain-fundamentals-005', 'Blockchain Applications and Future', 
's3://fractional-docs/blockchain-fundamentals/section-005.pdf',
'USDC', 2200, 'application/pdf', 428000,
'e5f6789012345678901234567890abcdef1234567890abcdef1234567890a1b2c3d4',
280,
'Exploration of real-world blockchain applications across industries and future technological developments.',
'supply chain, healthcare, DeFi, identity management, voting, real estate, scalability, interoperability, IoT, quantum-resistant');

-- Insert sample user payments (for testing)
INSERT INTO user_payments (user_id, resource_id, currency_code, amount_minor_units, payment_status, facilitator_tx_id, paid_at) VALUES
('user123', 'blockchain-fundamentals-001', 'USDC', 1000, 'completed', 'usdc_tx_1234567890abcdef', datetime('now', '-1 day')),
('user123', 'blockchain-fundamentals-002', 'USDC', 1500, 'completed', 'usdc_tx_2345678901bcdefg', datetime('now', '-2 hours')),
('user456', 'blockchain-fundamentals-001', 'USDC', 1000, 'completed', 'usdc_tx_3456789012cdefgh', datetime('now', '-30 minutes'));

-- Insert corresponding user access records
INSERT INTO user_access (user_id, resource_id, textbook_id, granted_at) VALUES
('user123', 'blockchain-fundamentals-001', 1, datetime('now', '-1 day')),
('user123', 'blockchain-fundamentals-002', 1, datetime('now', '-2 hours')),
('user456', 'blockchain-fundamentals-001', 1, datetime('now', '-30 minutes'));

-- Update the full-text search index
INSERT INTO sections_fts(sections_fts) VALUES('rebuild');

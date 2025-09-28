-- Sample data for testing the Fractional Document Unlock app
-- This migration adds sample textbook and section data

-- Insert sample textbook
INSERT INTO textbooks (title, author, description, total_sections) VALUES 
('Introduction to Blockchain Technology', 'Dr. Sarah Chen', 'A comprehensive guide to understanding blockchain fundamentals, cryptography, and distributed systems.', 5);

-- Get the textbook ID for foreign key references
-- Note: In a real migration, you'd need to handle this differently
-- For now, we'll assume the textbook has ID 1

-- Insert sample sections
INSERT INTO sections (textbook_id, section_number, title, content, price_sats, word_count, summary, keywords) VALUES 
(1, 1, 'What is Blockchain?', 
'Blockchain is a distributed ledger technology that maintains a continuously growing list of records, called blocks, which are linked and secured using cryptography. Each block contains a cryptographic hash of the previous block, a timestamp, and transaction data. This design makes blockchains inherently resistant to modification of the data. Once recorded, the data in any given block cannot be altered retroactively without alteration of all subsequent blocks, which requires collusion of the network majority.

Blockchain was invented by a person (or group of people) using the name Satoshi Nakamoto in 2008 to serve as the public transaction ledger of the cryptocurrency bitcoin. The identity of Satoshi Nakamoto remains unknown. The invention of the blockchain for bitcoin made it the first digital currency to solve the double-spending problem without the need of a trusted authority or central server.', 
1000, 150, 
'Introduction to blockchain technology, its core concepts, and historical context including Satoshi Nakamoto and bitcoin.',
'blockchain, distributed ledger, cryptography, bitcoin, satoshi nakamoto, double-spending'),

(1, 2, 'Cryptographic Foundations', 
'Cryptography is the practice and study of techniques for secure communication in the presence of third parties. In the context of blockchain, cryptography provides several key functions:

1. Hash Functions: One-way functions that convert input data of any size into a fixed-size output. SHA-256 is commonly used in blockchain systems.

2. Digital Signatures: Allow users to prove ownership of a private key without revealing it. This enables secure transactions and identity verification.

3. Merkle Trees: Data structures that allow efficient and secure verification of large data structures. They are used to verify transaction integrity in blocks.

4. Public Key Cryptography: Uses pairs of keys (public and private) for encryption and decryption. The public key can be shared openly, while the private key must be kept secret.', 
1500, 200,
'Deep dive into cryptographic concepts essential for blockchain: hash functions, digital signatures, Merkle trees, and public key cryptography.',
'cryptography, hash functions, SHA-256, digital signatures, Merkle trees, public key, private key'),

(1, 3, 'Consensus Mechanisms', 
'Consensus mechanisms are protocols that ensure all nodes in a blockchain network agree on the current state of the ledger. Different consensus mechanisms have different trade-offs in terms of security, scalability, and energy efficiency:

1. Proof of Work (PoW): Used by Bitcoin, requires miners to solve computationally intensive puzzles. High security but energy-intensive.

2. Proof of Stake (PoS): Validators are chosen based on the amount of cryptocurrency they hold and are willing to "stake" as collateral. More energy-efficient than PoW.

3. Delegated Proof of Stake (DPoS): Token holders vote for delegates who validate transactions. Balances decentralization with efficiency.

4. Practical Byzantine Fault Tolerance (PBFT): Designed to handle Byzantine failures in distributed systems. Used in permissioned blockchains.', 
2000, 250,
'Comprehensive overview of consensus mechanisms including PoW, PoS, DPoS, and PBFT, with their trade-offs and use cases.',
'consensus, proof of work, proof of stake, mining, validators, Byzantine fault tolerance, PBFT'),

(1, 4, 'Smart Contracts and DApps', 
'Smart contracts are self-executing contracts with the terms of the agreement directly written into code. They run on blockchain networks and automatically execute when predetermined conditions are met.

Key characteristics of smart contracts:
- Immutable: Once deployed, the code cannot be changed
- Transparent: All code and execution is visible on the blockchain
- Decentralized: No single point of failure
- Automated: Execute automatically without human intervention

Decentralized Applications (DApps) are applications that run on a peer-to-peer network of computers rather than a single computer. They typically consist of:
- Frontend: User interface (can be traditional web app)
- Smart contracts: Backend logic on the blockchain
- Blockchain network: Where the application runs

Popular platforms for smart contracts include Ethereum, Solana, and Cardano.', 
1800, 220,
'Introduction to smart contracts and decentralized applications, their characteristics, and popular development platforms.',
'smart contracts, DApps, decentralized applications, Ethereum, Solana, Cardano, immutable, transparent'),

(1, 5, 'Blockchain Applications and Future', 
'Blockchain technology has applications far beyond cryptocurrency:

1. Supply Chain Management: Track products from origin to consumer, ensuring authenticity and reducing fraud.

2. Healthcare: Secure patient data sharing, drug traceability, and medical record management.

3. Finance: Cross-border payments, trade finance, and decentralized finance (DeFi) applications.

4. Identity Management: Self-sovereign identity systems that give users control over their personal data.

5. Voting Systems: Transparent and tamper-proof voting mechanisms.

6. Real Estate: Property title management and automated property transfers.

Future developments include:
- Scalability solutions (Layer 2, sharding)
- Interoperability between different blockchains
- Integration with IoT devices
- Quantum-resistant cryptography
- Environmental sustainability improvements', 
2200, 280,
'Exploration of real-world blockchain applications across industries and future technological developments.',
'supply chain, healthcare, DeFi, identity management, voting, real estate, scalability, interoperability, IoT, quantum-resistant');

-- Update the full-text search index
INSERT INTO sections_fts(sections_fts) VALUES('rebuild');

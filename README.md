# 🌿 EcoTourNFT: Decentralized Marketplace for Eco-Tourism NFTs

Welcome to EcoTourNFT, a groundbreaking Web3 platform that addresses the real-world problem of underfunded conservation efforts and environmental degradation from traditional tourism. By creating a decentralized marketplace for eco-tourism NFTs, users can "virtually own" portions of protected natural areas, with proceeds directly funding conservation projects. This promotes sustainable eco-tourism without physical impact, empowering communities and preserving biodiversity on the Stacks blockchain using Clarity smart contracts.

## ✨ Features

🌍 Virtual ownership of protected areas via NFTs, tied to real-world conservation sites  
💰 Marketplace for buying, selling, and trading eco-tourism NFTs  
📈 Funding mechanism that channels NFT sales and royalties to verified conservation organizations  
🗳️ Governance for community-driven decisions on fund allocation and new area listings  
🔒 Secure verification of conservation partnerships to ensure authenticity  
📊 Staking rewards for NFT holders, incentivizing long-term support  
🚫 Anti-speculation tools like royalty fees and holding periods to prioritize conservation over profit  
🔄 Integration with oracles for real-time updates on conservation impact  

## 🛠 How It Works

EcoTourNFT leverages the Stacks blockchain and Clarity smart contracts to create a transparent, decentralized system. Users interact via a dApp frontend, but all core logic lives on-chain for trustlessness.

**For Conservation Organizations**  
- Partner with the platform by submitting area details (e.g., coordinates, descriptions)  
- Use the AreaRegistry contract to list protected areas  
- Receive funds automatically via the FundingDistributor contract after NFT sales  

**For Users (Buyers/Owners)**  
- Browse listed areas in the marketplace  
- Purchase an NFT representing virtual ownership using STX or a custom eco-token  
- Stake your NFT to earn rewards based on conservation milestones  
- Trade on the secondary market, with royalties flowing back to conservation  
- Vote on governance proposals if holding governance tokens  

**For Verifiers/Auditors**  
- Check NFT authenticity and ownership via the EcoNFT contract  
- View fund distribution transparency through on-chain queries  
- Use the OracleIntegrator for off-chain data on real-world impact (e.g., tree planting metrics)  

The platform solves funding shortages in conservation (e.g., only 10-20% of needed global funds are met annually) by tokenizing virtual experiences, reducing over-tourism while generating sustainable revenue.

## 📜 Smart Contracts Overview

This project involves 8 Clarity smart contracts for robustness and modularity. Each handles a specific aspect to ensure security and scalability on Stacks.

1. **EcoNFT.clar**: Core NFT contract for minting, transferring, and metadata storage of eco-tourism NFTs. Uses SIP-009 standard with custom traits for area-specific data (e.g., GPS coordinates, biodiversity info).  

2. **Marketplace.clar**: Handles listing, bidding, and auctions for NFTs. Includes buy-now options and escrow for safe trades.  

3. **EcoToken.clar**: Fungible token (SIP-010) for platform rewards and payments, earned via staking or governance participation.  

4. **AreaRegistry.clar**: Registers and verifies protected areas. Stores details like organization partnerships and ensures uniqueness to prevent duplicates.  

5. **FundingDistributor.clar**: Manages escrow and automated distribution of funds (e.g., 70% to conservation orgs, 20% to platform DAO, 10% royalties). Uses multisig for large payouts.  

6. **Governance.clar**: DAO-style contract for proposals and voting. NFT holders or token stakers can vote on new areas, fund allocations, or updates.  

7. **StakingRewards.clar**: Allows NFT staking to earn EcoTokens based on holding duration and conservation milestones. Includes unstaking with cooldowns.  

8. **OracleIntegrator.clar**: Interfaces with trusted oracles (e.g., via Stacks APIs) for feeding real-world data like conservation progress, triggering rewards or updates.  

## 🚀 Getting Started

To deploy and test:  
- Install Clarinet (Stacks dev tool)  
- Clone the repo and run `clarinet test` for unit tests  
- Deploy to Stacks testnet via `clarinet deploy`  
- Interact using the Stacks Wallet or custom dApp  

Join the movement to fund conservation through blockchain—virtual ownership, real impact!
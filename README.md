# Dhvani 🎙️🔒

Dhvani is a privacy-first, verifiable voice note vault built on [Ritual Chain](https://ritual.net). It allows users to record, encrypt, and store voice memos directly to the chain, utilizing the **Ed25519 Precompile (0x0009)** for cryptographic ownership verification.

## Architecture

- **Frontend**: Next.js (App Router), Wagmi v2, Viem, TailwindCSS.
- **Contracts**: Foundry, Ritual-native precompiles.
- **Cryptography**: 
  - `eciesjs` for client-side encryption of the audio buffer (ensuring only the owner can decrypt).
  - `@noble/ed25519` for generating an Ed25519 signature over the voiceprint hash, which is natively verified by the Ritual Chain Ed25519 precompile during the verification transaction.

## Folder Structure

- `/contracts`: Foundry project containing the `Dhvani.sol` smart contract and deployment scripts.
- `/frontend`: Next.js web application for recording, encrypting, and interacting with the contract.

## Setup Instructions

### 1. Smart Contracts

```bash
cd contracts
cp .env.example .env
# Edit .env and add your Ritual testnet PRIVATE_KEY
```

Install Foundry dependencies and compile:
```bash
forge install
forge build
```

Run tests:
```bash
forge test
```

Deploy to Ritual Testnet:
```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url https://rpc.ritual.net --broadcast
```
*Note the deployed contract address.*

### 2. Frontend

Navigate to the frontend folder:
```bash
cd frontend
npm install
```

Update the Contract Address:
In `src/components/AudioRecorder.tsx` and `src/components/NoteList.tsx`, replace `DHVANI_ADDRESS` with your newly deployed contract address.

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dApp.

## Usage Guide

1. **Connect Wallet**: Connect your Ritual-compatible wallet (make sure you are on Chain ID 1979).
2. **Record a Note**: Click "Record", speak your memo, and stop. Click "Save Vault".
3. **Encryption & Hashing**: The app will automatically generate local ECIES and Ed25519 keypairs in your browser cache. It computes the SHA-256 hash of the audio buffer, encrypts the buffer, and submits a `storeNote` transaction.
4. **Verification**: In "Your Notes", click "Verify on Chain". This signs your hash with the Ed25519 private key and submits a transaction to `verifyNote`, where Ritual Chain natively validates the signature using the `0x0009` precompile!
5. **Decryption**: Click "Decrypt Locally" to unlock and listen to your encrypted memo.

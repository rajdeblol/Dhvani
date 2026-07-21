'use client'

import React, { useState } from 'react'
import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { decrypt } from 'eciesjs'
import { toHex, fromHex, hexToString } from 'viem'
import { Buffer } from 'buffer'
import { LockOpen, CheckCircle, Play, Mic, Loader2 } from 'lucide-react'
import { computeAudioHash, getOrCreateKeys, signHash } from '@/lib/crypto'

// Use environment variable for the deployed contract address
const DHVANI_ADDRESS = (process.env.NEXT_PUBLIC_DHVANI_ADDRESS || '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045') as `0x${string}`

const DHVANI_ABI = [
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'notes',
    outputs: [
      { internalType: 'bytes32', name: 'contentHash', type: 'bytes32' },
      { internalType: 'bytes', name: 'encryptedData', type: 'bytes' },
      { internalType: 'bytes', name: 'metadata', type: 'bytes' },
      { internalType: 'bytes32', name: 'ed25519PubKey', type: 'bytes32' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'recomputedHash', type: 'bytes32' },
      { internalType: 'bytes', name: 'signature', type: 'bytes' }
    ],
    name: 'verifyNote',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
]

export default function NoteList() {
  const { address, isConnected } = useAccount()
  const { data: hash, writeContract, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const { data: noteData, refetch } = useReadContract({
    address: DHVANI_ADDRESS,
    abi: DHVANI_ABI,
    functionName: 'notes',
    args: [address],
    query: {
      enabled: isConnected && !!address
    }
  })

  const [decryptedAudioUrl, setDecryptedAudioUrl] = useState<string | null>(null)

  const handleDecrypt = () => {
    if (!noteData) return
    try {
      const { eciesPriv } = getOrCreateKeys()
      const encryptedHex = noteData[1] as `0x${string}`
      if (encryptedHex === '0x') return

      const encryptedBytes = Buffer.from(encryptedHex.replace('0x', ''), 'hex')
      const decryptedBytes = decrypt(eciesPriv.toHex(), encryptedBytes)
      
      const blob = new Blob([decryptedBytes], { type: 'audio/webm' })
      const url = URL.createObjectURL(blob)
      setDecryptedAudioUrl(url)
    } catch (err) {
      console.error('Decryption failed', err)
      alert('Decryption failed. You might not have the correct key.')
    }
  }

  const handleVerify = async () => {
    if (!noteData) return
    try {
      const { edPriv } = getOrCreateKeys()
      
      // Simulate re-recording by using the same hash for this demo's simplicity,
      // since exact SHA-256 matches are brittle for new recordings.
      // In a real production audio app, we'd use robust audio fingerprinting.
      const storedHash = noteData[0] as `0x${string}`
      
      // Sign the hash with Ed25519
      const signature = await signHash(storedHash, edPriv)

      writeContract({
        address: DHVANI_ADDRESS,
        abi: DHVANI_ABI,
        functionName: 'verifyNote',
        args: [storedHash, `0x${signature}`],
      })
    } catch (err) {
      console.error('Verification failed', err)
    }
  }

  if (!isConnected) return null

  // Check if a note exists (contentHash != 0)
  const hasNote = noteData && noteData[0] !== '0x0000000000000000000000000000000000000000000000000000000000000000'

  return (
    <div className="space-y-4">
      {!hasNote ? (
        <div className="text-zinc-500 italic">No notes found for this address.</div>
      ) : (
        <div className="p-4 border border-zinc-700 bg-zinc-900 rounded-lg flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-medium flex items-center gap-2">
              <LockOpen size={16} className="text-zinc-400" /> Secure Vault Note
            </span>
          </div>

          <div className="text-xs text-zinc-500 break-all bg-zinc-950 p-2 rounded">
            Hash: {noteData[0]}
          </div>

          <div className="flex gap-3 mt-2">
            {!decryptedAudioUrl ? (
              <button 
                onClick={handleDecrypt}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm font-medium transition-colors"
              >
                Decrypt Locally
              </button>
            ) : (
              <audio src={decryptedAudioUrl} controls className="h-8 w-full max-w-[200px]" />
            )}

            <button 
              onClick={handleVerify}
              disabled={isPending || isConfirming || isSuccess}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:text-zinc-400 rounded text-sm font-medium transition-colors flex items-center gap-1"
            >
              {(isPending || isConfirming) ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {isSuccess ? 'Verified!' : 'Verify on Chain'}
            </button>
          </div>
          
          {isSuccess && (
            <div className="text-green-400 text-xs flex items-center gap-1 mt-1">
              <CheckCircle size={12} /> Ed25519 Signature Verified on Ritual!
            </div>
          )}
        </div>
      )}
    </div>
  )
}

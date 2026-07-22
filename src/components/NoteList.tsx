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
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'notesByHash',
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
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserHashes',
    outputs: [{ internalType: 'bytes32[]', name: '', type: 'bytes32[]' }],
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
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError: isTxError, error: txError } = useWaitForTransactionReceipt({ hash })

  const [decryptedAudioUrl, setDecryptedAudioUrl] = useState<string | null>(null)
  const [inputHash, setInputHash] = useState<string>('')

  const { data: userHashesData } = useReadContract({
    address: DHVANI_ADDRESS,
    abi: DHVANI_ABI,
    functionName: 'getUserHashes',
    args: [address],
    query: { enabled: isConnected && !!address }
  })
  
  const userHashes = userHashesData as `0x${string}`[] | undefined
  const latestHash = userHashes && userHashes.length > 0 ? userHashes[userHashes.length - 1] : undefined

  const hashToFetch = (inputHash.trim() || latestHash) as `0x${string}` | undefined

  const { data: rawNoteData, refetch } = useReadContract({
    address: DHVANI_ADDRESS,
    abi: DHVANI_ABI,
    functionName: 'notesByHash',
    args: [hashToFetch as `0x${string}`],
    query: { enabled: isConnected && !!hashToFetch }
  })
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noteData = rawNoteData as any

  const handleDecrypt = () => {
    if (!noteData) return
    try {
      const { eciesPriv } = getOrCreateKeys()
      const encryptedHex = noteData[1] as `0x${string}`
      if (encryptedHex === '0x') return

      const encryptedBytes = Buffer.from(encryptedHex.replace('0x', ''), 'hex')
      const decryptedBytes = decrypt(eciesPriv.toHex(), encryptedBytes)
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = new Blob([decryptedBytes as any], { type: 'audio/webm' })
      const url = URL.createObjectURL(blob)
      setDecryptedAudioUrl(url)
    } catch (err) {
      console.error('Decryption failed', err)
      alert('SYS_ERR: DECRYPTION_FAILED. INVALID_KEY.')
    }
  }

  const handleVerify = async () => {
    if (!noteData) return
    try {
      const { edPriv } = getOrCreateKeys()
      
      const hashToVerify = (inputHash.trim() || noteData?.[0]) as `0x${string}`
      
      const signature = await signHash(hashToVerify, edPriv)

      writeContract({
        address: DHVANI_ADDRESS,
        abi: DHVANI_ABI,
        functionName: 'verifyNote',
        args: [hashToVerify, signature],
        gas: BigInt(5000000), 
      })
    } catch (err) {
      console.error('Verification failed', err)
    }
  }

  if (!isConnected) return null

  const hasNote = noteData && noteData[0] !== '0x0000000000000000000000000000000000000000000000000000000000000000'

  return (
    <div className="w-full">
      {!hasNote ? (
        <div className="glass-panel rounded-xl p-8 text-center text-brand-muted border-brand-border">
          Your vault is currently empty.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-panel rounded-2xl p-6 md:p-8 flex flex-col justify-between min-h-[400px]">
            
            <div className="flex items-start justify-between border-b border-brand-border pb-6 mb-6">
              <div>
                <h3 className="font-semibold text-xl text-white mb-1">Encrypted Payload</h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  Stored on Ritual
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center">
                <LockOpen size={18} className="text-brand-muted" />
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-8">
              <label className="text-sm font-medium text-brand-muted">Verification Hash</label>
              <input 
                type="text" 
                value={inputHash}
                onChange={(e) => setInputHash(e.target.value)}
                placeholder="0x..." 
                className="font-mono text-sm text-brand-text bg-brand-bg px-4 py-3 rounded-lg border border-brand-border outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-full"
              />
            </div>

            {(error || isTxError) && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium mb-8">
                Verification failed: {error?.message || txError?.message || 'Transaction rejected'}
              </div>
            )}
            
            {isSuccess && (
              <div className="flex flex-col gap-3 mb-8">
                <div className="bg-brand-success/10 border border-brand-success/30 p-4 rounded-xl text-sm font-medium text-brand-success flex items-center gap-3">
                  <CheckCircle size={18} /> 
                  Signature verified on Ritual Network
                </div>
                {hash && (
                  <a 
                    href={`https://explorer.ritualfoundation.org/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-center text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
                  >
                    View Verification Transaction on Ritual Explorer
                  </a>
                )}
              </div>
            )}

            <div className="mt-auto space-y-4">
              {decryptedAudioUrl && (
                <div className="p-4 bg-brand-bg rounded-xl border border-brand-border mb-6">
                  <div className="text-xs font-medium text-brand-muted mb-3 flex items-center gap-2">
                    <span className="text-indigo-400">✓</span> Audio Decrypted Locally
                  </div>
                  <audio src={decryptedAudioUrl} controls className="w-full h-10" />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {!decryptedAudioUrl && (
                  <button 
                    onClick={handleDecrypt}
                    className="px-4 py-3 rounded-lg font-medium text-brand-text bg-brand-surface border border-brand-border hover:bg-brand-surface-hover transition-colors text-sm"
                  >
                    Decrypt Audio
                  </button>
                )}

                <button 
                  onClick={handleVerify}
                  disabled={isPending || isConfirming || isSuccess}
                  className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm ${
                    isSuccess 
                      ? 'bg-brand-success/10 text-brand-success border border-brand-success/30 cursor-default' 
                      : 'text-white primary-gradient hover:opacity-90 shadow-sm disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed'
                  } ${decryptedAudioUrl ? 'col-span-1 sm:col-span-2' : ''}`}
                >
                  {(isPending || isConfirming) ? <Loader2 size={16} className="animate-spin" /> : (isSuccess ? <CheckCircle size={16} /> : null)}
                  {isSuccess ? 'Verified' : 'Verify on Ritual'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

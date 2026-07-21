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
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError: isTxError, error: txError } = useWaitForTransactionReceipt({ hash })

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
  const [inputHash, setInputHash] = useState<string>('')

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
      
      const hashToVerify = (inputHash.trim() || noteData[0]) as `0x${string}`
      
      // Sign the hash with Ed25519
      const signature = await signHash(hashToVerify, edPriv)

      writeContract({
        address: DHVANI_ADDRESS,
        abi: DHVANI_ABI,
        functionName: 'verifyNote',
        args: [hashToVerify, signature],
        gas: BigInt(5000000), // Bypass viem gas estimation bug on Ritual RPC
      })
    } catch (err) {
      console.error('Verification failed', err)
    }
  }

  if (!isConnected) return null

  // Check if a note exists (contentHash != 0)
  const hasNote = noteData && noteData[0] !== '0x0000000000000000000000000000000000000000000000000000000000000000'

  return (
    <div className="space-y-8">
      {!hasNote ? (
        <div className="font-satoshi font-medium text-brand-primary text-xl border-l-4 border-brand-primary pl-6 py-2">
          NO TRANSMISSIONS FOUND IN THE VAULT.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="col-span-1 flex flex-col justify-between border-2 border-brand-primary bg-white p-6 shadow-[16px_16px_0_0_#1E1E1E] transition-all hover:shadow-[8px_8px_0_0_#1E1E1E] hover:translate-x-2 hover:translate-y-2 min-h-[400px]">
            
            {/* Card Header */}
            <div className="flex items-start justify-between border-b-2 border-brand-primary pb-4 mb-6">
              <div>
                <span className="font-clash font-bold text-2xl uppercase tracking-tighter block mb-1">Vault Item</span>
                <span className="font-satoshi text-xs font-bold tracking-widest uppercase text-brand-primary/50">SECURE ENCLAVE</span>
              </div>
              <LockOpen size={24} className="text-brand-primary" />
            </div>

            {/* Input Hash */}
            <div className="flex flex-col gap-2 mb-6">
              <label className="font-satoshi text-xs font-bold uppercase tracking-widest text-brand-primary">Paste Hash to Verify:</label>
              <input 
                type="text" 
                value={inputHash}
                onChange={(e) => setInputHash(e.target.value)}
                placeholder="0x..." 
                className="font-mono text-sm text-brand-primary bg-brand-base p-3 border-2 border-brand-primary outline-none focus:bg-white w-full transition-colors"
              />
            </div>

            {/* Verification Errors */}
            {(error || isTxError) && (
              <div className="font-satoshi font-bold text-brand-base bg-brand-red p-3 mb-6 uppercase tracking-wide text-xs break-words">
                VERIFICATION FAILED: {error?.message || txError?.message || 'Transaction reverted'}
              </div>
            )}
            
            {/* Success State */}
            {isSuccess && (
              <div className="font-satoshi font-bold text-white bg-green-600 p-3 mb-6 uppercase tracking-wide text-xs flex items-center gap-2">
                <CheckCircle size={16} /> ED25519 SIGNATURE VERIFIED
              </div>
            )}

            <div className="mt-auto space-y-4">
              {decryptedAudioUrl && (
                <div className="p-3 bg-brand-base border-2 border-brand-primary mb-4">
                  <audio src={decryptedAudioUrl} controls className="w-full h-8" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {!decryptedAudioUrl && (
                  <button 
                    onClick={handleDecrypt}
                    className="group relative overflow-hidden border-2 border-brand-primary text-brand-primary px-4 py-3 font-satoshi font-bold tracking-widest uppercase text-xs transition-colors duration-300 hover:bg-brand-primary hover:text-brand-base"
                  >
                    Decrypt
                  </button>
                )}

                <button 
                  onClick={handleVerify}
                  disabled={isPending || isConfirming || isSuccess}
                  className={`group relative overflow-hidden px-4 py-3 font-satoshi font-bold tracking-widest uppercase text-xs transition-colors duration-300 flex items-center justify-center gap-2 ${
                    isSuccess 
                      ? 'bg-green-600 text-white cursor-default border-2 border-green-600' 
                      : 'bg-brand-primary text-brand-base hover:text-brand-red border-2 border-brand-primary disabled:bg-brand-primary/50 disabled:hover:text-brand-base disabled:cursor-not-allowed'
                  } ${decryptedAudioUrl ? 'col-span-2' : ''}`}
                >
                  {!isSuccess && <span className="absolute inset-0 bg-white transform -translate-x-full transition-transform duration-300 ease-out group-hover:translate-x-0" />}
                  <span className="relative z-10 flex items-center gap-2">
                    {(isPending || isConfirming) ? <Loader2 size={14} className="animate-spin" /> : (isSuccess ? <CheckCircle size={14} /> : null)}
                    {isSuccess ? 'VERIFIED' : 'VERIFY ON CHAIN'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

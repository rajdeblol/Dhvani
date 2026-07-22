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

  const { data, refetch } = useReadContract({
    address: DHVANI_ADDRESS,
    abi: DHVANI_ABI,
    functionName: 'notes',
    args: [address],
    query: {
      enabled: isConnected && !!address
    }
  })
  const noteData = data as any

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
      
      const hashToVerify = (inputHash.trim() || noteData[0]) as `0x${string}`
      
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
        <div className="font-mono text-vault-muted text-lg border-l-2 border-vault-muted pl-4 py-2 bg-vault-panel/30">
          [SYS_INFO: NO_TRANSMISSIONS_IN_VAULT]
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col justify-between border border-vault-border bg-vault-panel/60 backdrop-blur-md p-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] min-h-[400px]">
            
            <div className="flex items-start justify-between border-b border-vault-border pb-4 mb-8">
              <div>
                <span className="font-space font-bold text-2xl text-vault-text tracking-wider block mb-1">ENCRYPTED_DATA_PACKET</span>
                <span className="font-mono text-xs text-vault-magenta tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-vault-magenta animate-pulse-ring rounded-full" />
                  SECURE_LEDGER_ENTRY
                </span>
              </div>
              <LockOpen size={20} className="text-vault-magenta" />
            </div>

            <div className="flex flex-col gap-3 mb-8">
              <label className="font-mono text-xs tracking-widest text-vault-muted">INPUT_HASH_FOR_VERIFICATION:</label>
              <input 
                type="text" 
                value={inputHash}
                onChange={(e) => setInputHash(e.target.value)}
                placeholder="0x..." 
                className="font-mono text-sm text-vault-text bg-vault-bg/50 p-4 border border-vault-border outline-none focus:border-vault-magenta focus:shadow-[0_0_15px_rgba(176,38,255,0.2)] transition-all w-full"
              />
            </div>

            {(error || isTxError) && (
              <div className="font-mono text-vault-bg bg-vault-magenta p-4 mb-8 text-sm font-bold animate-decrypt">
                SYS_ERR: VERIFICATION_FAILED // {error?.message || txError?.message || 'TX_REJECTED'}
              </div>
            )}
            
            {isSuccess && (
              <div className="font-mono text-vault-cyan bg-vault-cyan/10 border border-vault-cyan p-4 mb-8 text-sm font-bold flex items-center gap-3">
                <CheckCircle size={16} /> 
                ED25519_SIGNATURE_VERIFIED_ON_CHAIN
              </div>
            )}

            <div className="mt-auto space-y-4">
              {decryptedAudioUrl && (
                <div className="p-4 bg-vault-bg/50 border border-vault-cyan/30 mb-6">
                  <div className="font-mono text-xs text-vault-cyan mb-2">AUDIO_STREAM_DECRYPTED</div>
                  <audio src={decryptedAudioUrl} controls className="w-full h-10 custom-audio-player" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {!decryptedAudioUrl && (
                  <button 
                    onClick={handleDecrypt}
                    className="relative border border-vault-border text-vault-text px-4 py-4 font-mono font-bold tracking-widest text-xs transition-all hover:bg-vault-border/50 hover:text-white"
                  >
                    INITIATE_DECRYPTION
                  </button>
                )}

                <button 
                  onClick={handleVerify}
                  disabled={isPending || isConfirming || isSuccess}
                  className={`relative border px-4 py-4 font-mono font-bold tracking-widest text-xs transition-all flex items-center justify-center gap-3 ${
                    isSuccess 
                      ? 'bg-vault-cyan/10 text-vault-cyan border-vault-cyan cursor-default' 
                      : 'bg-vault-magenta border-vault-magenta text-vault-bg hover:bg-vault-magenta/80 hover:shadow-[0_0_20px_rgba(176,38,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed'
                  } ${decryptedAudioUrl ? 'col-span-2' : ''}`}
                >
                  {(isPending || isConfirming) ? <Loader2 size={16} className="animate-spin" /> : (isSuccess ? <CheckCircle size={16} /> : null)}
                  {isSuccess ? 'VERIFIED' : 'VERIFY_SIGNATURE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

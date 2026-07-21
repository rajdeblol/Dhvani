'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { encrypt } from 'eciesjs'
import { toHex, bytesToHex } from 'viem'
import { Buffer } from 'buffer'
import { Mic, Square, Save, Loader2, Upload } from 'lucide-react'
import { computeAudioHash, getOrCreateKeys } from '@/lib/crypto'
import WaveSurfer from 'wavesurfer.js'

// ABI for Dhvani contract (storeNote)
const DHVANI_ABI = [
  {
    inputs: [
      { internalType: 'bytes32', name: '_contentHash', type: 'bytes32' },
      { internalType: 'bytes', name: '_encryptedData', type: 'bytes' },
      { internalType: 'bytes', name: '_metadata', type: 'bytes' },
      { internalType: 'bytes32', name: '_ed25519PubKey', type: 'bytes32' }
    ],
    name: 'storeNote',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
]

// Use environment variable for the deployed contract address
const DHVANI_ADDRESS = (process.env.NEXT_PUBLIC_DHVANI_ADDRESS || '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045') as `0x${string}`

export default function AudioRecorder() {
  const { isConnected } = useAccount()
  const { data: hash, isPending, writeContractAsync } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const [isRecording, setIsRecording] = useState(false)
  const [audioBuffer, setAudioBuffer] = useState<ArrayBuffer | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [savedHash, setSavedHash] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  
  const waveformRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (waveformRef.current) {
      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#4f46e5',
        progressColor: '#818cf8',
        cursorColor: 'transparent',
        barWidth: 2,
        height: 50,
      })
    }
    return () => wavesurferRef.current?.destroy()
  }, [])

  const startRecording = async () => {
    setErrorMsg(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        chunksRef.current = []
        const arrayBuffer = await blob.arrayBuffer()
        setAudioBuffer(arrayBuffer)
        
        // Load into wavesurfer for playback
        const url = URL.createObjectURL(blob)
        wavesurferRef.current?.load(url)
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
      setAudioBuffer(null)
    } catch (err) {
      console.error('Failed to start recording', err)
      setErrorMsg('Failed to start recording.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null)
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const arrayBuffer = await file.arrayBuffer()
      setAudioBuffer(arrayBuffer)

      const url = URL.createObjectURL(file)
      // Delay slightly to ensure React has updated the DOM before wavesurfer tries to draw
      setTimeout(() => {
        wavesurferRef.current?.load(url)
      }, 100)
    } catch (err) {
      console.error('Failed to load file', err)
      setErrorMsg('Could not process this audio file. Please ensure it is a valid audio format.')
    } finally {
      // Clear input so same file can be uploaded again
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const saveToChain = async () => {
    if (!audioBuffer) return
    setErrorMsg(null)

    try {
      // Polyfill global Buffer for eciesjs if missing
      if (typeof window !== 'undefined' && !window.Buffer) {
        window.Buffer = Buffer
      }

      const { eciesPub, edPub } = getOrCreateKeys()
      
      // Compute keccak256 hash
      const contentHash = await computeAudioHash(audioBuffer)
      
      // Encrypt the audio buffer
      const audioBufferView = Buffer.from(audioBuffer)
      const encryptedBuffer = encrypt(eciesPub.toHex(), audioBufferView)
      const encryptedHex = toHex(encryptedBuffer)
      
      // Metadata (e.g., timestamp)
      const metadataStr = JSON.stringify({ timestamp: Date.now() })
      const metadataHex = toHex(Buffer.from(metadataStr))
      
      const edPubHex = toHex(edPub) as `0x${string}`

      await writeContractAsync({
        address: DHVANI_ADDRESS,
        abi: DHVANI_ABI,
        functionName: 'storeNote',
        args: [contentHash, encryptedHex, metadataHex, edPubHex],
      })
      
      setSavedHash(contentHash)
    } catch (err: any) {
      console.error('Error saving to chain', err)
      const msg = `Error: ${err?.shortMessage || err?.message || err?.toString() || 'Unknown error'}`
      setErrorMsg(msg)
      window.alert(msg)
    }
  }

  if (!isConnected) {
    return <div className="text-zinc-400">Please connect wallet to record notes. Ensure you are on the Ritual Testnet (Chain ID 1979).</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-950/30 border border-blue-900/50 text-blue-200 p-3 rounded-lg text-sm">
        <p><strong>Note:</strong> Please ensure your wallet is connected to the <strong>Ritual Testnet</strong> (Chain ID: 1979).</p>
      </div>
      <div className="flex flex-wrap gap-4 items-center">
        {!isRecording ? (
          <button 
            onClick={startRecording}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Mic size={18} /> Record
          </button>
        ) : (
          <button 
            onClick={stopRecording}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors flex items-center gap-2 animate-pulse"
          >
            <div className="w-2 h-2 bg-white rounded-full" /> Stop Recording
          </button>
        )}

        <label className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-2">
          <Upload size={18} /> Upload File
          <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      <div 
        ref={waveformRef} 
        className={`w-full rounded bg-zinc-950 border border-zinc-800 transition-all duration-300 ${(!audioBuffer && !isRecording) ? 'opacity-0 h-0 overflow-hidden border-transparent' : 'opacity-100 p-2'}`}
      />

      {audioBuffer && !isRecording && (
        <div className="space-y-4">
          <button 
            onClick={saveToChain}
            disabled={isPending || isConfirming}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-900 disabled:text-zinc-400 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isPending || isConfirming ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isConfirming ? 'Confirming...' : 'Save Vault'}
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="text-red-400 font-medium text-sm p-3 bg-red-950/50 rounded-lg border border-red-900">
          {errorMsg}
        </div>
      )}

      {isSuccess && (
        <div className="text-green-400 font-medium p-3 bg-green-950/20 border border-green-900/50 rounded-lg space-y-2">
          <p>Note successfully saved to the blockchain!</p>
          {savedHash && (
            <div className="text-xs text-zinc-400 break-all bg-zinc-900 p-2 rounded">
              Your Hash: <span className="text-zinc-300">{savedHash}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

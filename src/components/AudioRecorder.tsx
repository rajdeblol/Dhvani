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
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
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
    setUploadedFileName(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Force extreme low bitrate (8kbps) to ensure the file is tiny and doesn't crash the RPC
      const options = { audioBitsPerSecond: 8000 }
      mediaRecorderRef.current = new MediaRecorder(stream, options)
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        chunksRef.current = []
        const arrayBuffer = await blob.arrayBuffer()
        setAudioBuffer(arrayBuffer)
        setUploadedFileName("Recorded Audio (Microphone)")
        
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
      setUploadedFileName(file.name)

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

    // User requested up to 1MB. Warning: The Ritual RPC might reject this with "oversized data"!
    if (audioBuffer.byteLength > 1048576) {
      setErrorMsg(`Audio file is too large (${Math.round(audioBuffer.byteLength / 1024)}KB). Please keep it under 1MB!`)
      return
    }

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
    return <div className="font-satoshi font-medium text-brand-primary text-xl border-l-4 border-brand-red pl-6 py-2">CONNECT WALLET TO RECORD.</div>
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-2">
        <h3 className="font-clash font-bold text-3xl uppercase tracking-tighter">NEW TRANSMISSION</h3>
        <p className="font-satoshi text-brand-primary/70 max-w-sm">
          Securely record or upload an audio file. Max limit 1MB.
        </p>
      </div>

      <div className="flex flex-wrap gap-6 items-center">
        {!isRecording ? (
          <button 
            onClick={startRecording}
            className="group relative overflow-hidden bg-brand-primary text-brand-base px-6 py-3 font-satoshi font-bold tracking-widest uppercase text-sm w-fit transition-colors duration-300 hover:text-brand-red flex items-center gap-2"
          >
            <span className="absolute inset-0 bg-white transform -translate-x-full transition-transform duration-300 ease-out group-hover:translate-x-0" />
            <span className="relative z-10 flex items-center gap-2"><Mic size={18} /> Record</span>
          </button>
        ) : (
          <button 
            onClick={stopRecording}
            className="group relative overflow-hidden bg-brand-red text-white px-6 py-3 font-satoshi font-bold tracking-widest uppercase text-sm w-fit transition-colors duration-300 flex items-center gap-3"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-pulse relative z-10" /> 
            <span className="relative z-10">Stop Recording</span>
          </button>
        )}

        <label className="group relative overflow-hidden border-2 border-brand-primary text-brand-primary px-6 py-3 font-satoshi font-bold tracking-widest uppercase text-sm w-fit transition-colors duration-300 hover:bg-brand-primary hover:text-brand-base cursor-pointer flex items-center gap-2">
          <Upload size={18} /> Upload File
          <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      <div 
        ref={waveformRef} 
        className={`w-full bg-white border-2 border-brand-primary transition-all duration-300 shadow-[8px_8px_0_0_#1E1E1E] ${(!audioBuffer && !isRecording) ? 'opacity-0 h-0 overflow-hidden border-transparent shadow-none' : 'opacity-100 p-4'}`}
      />

      {audioBuffer && !isRecording && (
        <div className="space-y-6 pt-6 border-t-2 border-brand-primary border-dashed">
          {uploadedFileName && (
            <div className="font-satoshi font-medium text-brand-primary flex items-center gap-3">
              <div className="w-3 h-3 bg-brand-orange animate-pulse" />
              <span>DATA LOADED: <strong className="uppercase">{uploadedFileName}</strong> ({(audioBuffer.byteLength / 1024).toFixed(1)} KB)</span>
            </div>
          )}
          
          <button 
            onClick={saveToChain}
            disabled={isPending || isConfirming}
            className="group relative overflow-hidden bg-brand-primary text-brand-base px-8 py-4 font-satoshi font-bold tracking-widest uppercase text-sm w-fit transition-colors duration-300 hover:text-brand-red flex items-center gap-2 disabled:bg-brand-primary/50 disabled:hover:text-brand-base disabled:cursor-not-allowed"
          >
            <span className="absolute inset-0 bg-white transform -translate-x-full transition-transform duration-300 ease-out group-hover:translate-x-0" />
            <span className="relative z-10 flex items-center gap-2">
              {isPending || isConfirming ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isConfirming ? 'CONFIRMING...' : 'SAVE TO VAULT'}
            </span>
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="font-satoshi font-bold text-brand-base bg-brand-red p-4 uppercase tracking-wide">
          ERROR: {errorMsg}
        </div>
      )}

      {isSuccess && (
        <div className="font-satoshi p-6 border-2 border-brand-primary bg-white shadow-[8px_8px_0_0_#1E1E1E] space-y-4">
          <p className="font-bold uppercase tracking-wider text-lg">Transmission Secured!</p>
          {savedHash && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-primary/50">CRYPTOGRAPHIC HASH</span>
              <span className="font-mono text-sm bg-brand-base p-3 break-all border border-brand-primary/20">
                {savedHash}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

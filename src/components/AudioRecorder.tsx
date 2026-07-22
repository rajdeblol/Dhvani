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
        waveColor: '#4f46e5', // Indigo 600
        progressColor: '#8b5cf6', // Violet 500
        cursorColor: 'transparent',
        barWidth: 2,
        barGap: 3,
        barRadius: 2,
        height: 60,
      })
    }
    return () => wavesurferRef.current?.destroy()
  }, [])

  const startRecording = async () => {
    setErrorMsg(null)
    setUploadedFileName(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
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
        setUploadedFileName("Recorded Audio")
        
        const url = URL.createObjectURL(blob)
        wavesurferRef.current?.load(url)
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
      setAudioBuffer(null)
    } catch (err) {
      console.error('Failed to start recording', err)
      setErrorMsg('Microphone access denied or failed.')
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
      setTimeout(() => {
        wavesurferRef.current?.load(url)
      }, 100)
    } catch (err) {
      console.error('Failed to load file', err)
      setErrorMsg('Invalid audio file format.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const saveToChain = async () => {
    if (!audioBuffer) return
    setErrorMsg(null)

    if (audioBuffer.byteLength > 1048576) {
      setErrorMsg(`File size exceeds maximum limit of 1MB (${Math.round(audioBuffer.byteLength / 1024)}KB)`)
      return
    }

    try {
      if (typeof window !== 'undefined' && !window.Buffer) {
        window.Buffer = Buffer
      }

      const { eciesPub, edPub } = getOrCreateKeys()
      const contentHash = await computeAudioHash(audioBuffer)
      const audioBufferView = Buffer.from(audioBuffer)
      const encryptedBuffer = encrypt(eciesPub.toHex(), audioBufferView)
      const encryptedHex = toHex(encryptedBuffer)
      
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Error saving to chain', err)
      setErrorMsg(`Transaction failed: ${err?.shortMessage || err?.message || 'Unknown error'}`)
    }
  }

  if (!isConnected) {
    return (
      <div className="glass-panel rounded-xl p-8 text-center text-brand-muted border-brand-border">
        Please connect your wallet to start recording.
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-2xl p-6 md:p-10">
      
      <div className="flex flex-wrap gap-4 items-center justify-center mb-10">
        {!isRecording ? (
          <button 
            onClick={startRecording}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-brand-surface border border-brand-border text-white hover:bg-brand-surface-hover transition-colors font-medium shadow-sm"
          >
            <div className="w-3 h-3 rounded-full bg-red-500" />
            Start Recording
          </button>
        ) : (
          <button 
            onClick={stopRecording}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors font-medium shadow-sm"
          >
            <div className="w-3 h-3 rounded-sm bg-red-500 animate-pulse" /> 
            Stop Recording
          </button>
        )}

        <div className="text-brand-muted text-sm px-2">or</div>

        <label className="flex items-center gap-2 px-6 py-3 rounded-full bg-transparent border border-brand-border text-brand-text hover:bg-brand-surface transition-colors cursor-pointer font-medium">
          <Upload size={18} className="text-brand-muted" /> 
          Upload Audio
          <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      <div 
        ref={waveformRef} 
        className={`w-full bg-brand-bg rounded-xl border border-brand-border transition-all duration-300 ${(!audioBuffer && !isRecording) ? 'opacity-0 h-0 overflow-hidden border-transparent' : 'opacity-100 p-6 mb-8'}`}
      />

      {audioBuffer && !isRecording && (
        <div className="pt-6 border-t border-brand-border flex flex-col items-center">
          {uploadedFileName && (
            <p className="text-brand-muted text-sm mb-6 flex items-center gap-2">
              <span className="text-brand-primary">✓</span> {uploadedFileName} ({(audioBuffer.byteLength / 1024).toFixed(1)} KB)
            </p>
          )}
          
          <button 
            onClick={saveToChain}
            disabled={isPending || isConfirming}
            className="w-full md:w-auto relative px-8 py-3 rounded-lg font-medium text-white primary-gradient hover:opacity-90 transition-all shadow-[0_4px_20px_rgba(99,102,241,0.4)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isPending || isConfirming ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isConfirming ? 'Awaiting Confirmation...' : 'Store Securely on Ritual'}
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mt-8 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium text-center">
          {errorMsg}
        </div>
      )}

      {isSuccess && (
        <div className="mt-8 p-6 rounded-xl border border-brand-success/30 bg-brand-success/10 text-center">
          <h4 className="font-semibold text-brand-success flex items-center justify-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-brand-success" />
            Successfully stored on Ritual Network
          </h4>
          {savedHash && (
            <div className="inline-flex flex-col items-center">
              <span className="text-xs text-brand-muted mb-1">Verification Hash</span>
              <span className="font-mono text-sm bg-brand-bg px-4 py-2 rounded-lg border border-brand-border break-all text-brand-text max-w-full">
                {savedHash}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

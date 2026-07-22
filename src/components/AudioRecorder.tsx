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
        waveColor: '#00E5FF',
        progressColor: '#B026FF',
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
        setUploadedFileName("REC_MIC_INPUT.raw")
        
        const url = URL.createObjectURL(blob)
        wavesurferRef.current?.load(url)
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
      setAudioBuffer(null)
    } catch (err) {
      console.error('Failed to start recording', err)
      setErrorMsg('SYS_ERR: AUDIO_INPUT_FAILED')
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
      setUploadedFileName(file.name.toUpperCase())

      const url = URL.createObjectURL(file)
      setTimeout(() => {
        wavesurferRef.current?.load(url)
      }, 100)
    } catch (err) {
      console.error('Failed to load file', err)
      setErrorMsg('SYS_ERR: INVALID_DATA_FORMAT')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const saveToChain = async () => {
    if (!audioBuffer) return
    setErrorMsg(null)

    if (audioBuffer.byteLength > 1048576) {
      setErrorMsg(`SYS_ERR: PAYLOAD_EXCEEDS_MAX_SIZE (${Math.round(audioBuffer.byteLength / 1024)}KB > 1MB)`)
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
    } catch (err: any) {
      console.error('Error saving to chain', err)
      setErrorMsg(`TX_REJECTED: ${err?.shortMessage || err?.message || 'UNKNOWN'}`)
    }
  }

  if (!isConnected) {
    return (
      <div className="font-mono text-vault-magenta text-lg border-l-2 border-vault-magenta pl-4 py-2 bg-vault-magenta/10">
        [SYS_REQ: CONNECT_NODE_TO_INITIALIZE]
      </div>
    )
  }

  return (
    <div className="bg-vault-panel/80 backdrop-blur-md border border-vault-border p-8 rounded-sm shadow-[0_0_30px_rgba(0,0,0,0.5)]">
      <div className="flex flex-col gap-2 mb-10 border-b border-vault-border pb-6">
        <h3 className="font-space font-bold text-2xl text-vault-text tracking-wider flex items-center gap-3">
          <div className="w-2 h-6 bg-vault-cyan" />
          AUDIO_CAPTURE_TERMINAL
        </h3>
        <p className="font-mono text-vault-muted text-sm ml-5">
          STATUS: <span className="text-vault-cyan">SECURE_CONNECTION</span> | ENCRYPTION: <span className="text-vault-cyan">ECIES_ENABLED</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-center mb-8">
        {!isRecording ? (
          <button 
            onClick={startRecording}
            className="group relative bg-vault-cyan/10 border border-vault-cyan/50 text-vault-cyan px-6 py-3 font-mono text-sm tracking-widest hover:bg-vault-cyan/20 hover:border-vault-cyan transition-all flex items-center gap-3"
          >
            <Mic size={16} /> 
            <span>[REC_START]</span>
          </button>
        ) : (
          <button 
            onClick={stopRecording}
            className="group relative bg-vault-magenta/20 border border-vault-magenta text-vault-magenta px-6 py-3 font-mono text-sm tracking-widest hover:bg-vault-magenta/30 hover:shadow-[0_0_15px_rgba(176,38,255,0.4)] transition-all flex items-center gap-3"
          >
            <div className="w-2 h-2 bg-vault-magenta rounded-full animate-pulse-ring" /> 
            <span>[REC_STOP]</span>
          </button>
        )}

        <label className="group border border-vault-border text-vault-muted px-6 py-3 font-mono text-sm tracking-widest hover:border-vault-text hover:text-vault-text cursor-pointer transition-all flex items-center gap-3">
          <Upload size={16} /> 
          <span>[UPLOAD_DATA]</span>
          <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      <div 
        ref={waveformRef} 
        className={`w-full bg-vault-bg/50 border border-vault-border transition-all duration-300 rounded-sm ${(!audioBuffer && !isRecording) ? 'opacity-0 h-0 overflow-hidden border-transparent' : 'opacity-100 p-4 mb-8'}`}
      />

      {audioBuffer && !isRecording && (
        <div className="space-y-6 pt-6 border-t border-vault-border">
          {uploadedFileName && (
            <div className="font-mono text-vault-text text-sm flex items-center gap-3 bg-vault-bg p-3 border border-vault-border">
              <div className="w-2 h-2 bg-vault-cyan animate-pulse" />
              <span>DATA_CACHED: <span className="text-vault-cyan">{uploadedFileName}</span> // SIZE: {(audioBuffer.byteLength / 1024).toFixed(1)} KB</span>
            </div>
          )}
          
          <button 
            onClick={saveToChain}
            disabled={isPending || isConfirming}
            className="w-full relative bg-vault-cyan border border-vault-cyan text-vault-bg px-8 py-4 font-mono font-bold tracking-widest text-sm transition-all hover:bg-vault-cyan/80 hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending || isConfirming ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isConfirming ? 'AWAITING_NETWORK_CONFIRMATION...' : 'ENCRYPT_AND_COMMIT_TO_VAULT'}
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mt-6 font-mono text-vault-bg bg-vault-magenta p-4 text-sm font-bold animate-decrypt">
          {errorMsg}
        </div>
      )}

      {isSuccess && (
        <div className="mt-6 font-mono p-6 border border-vault-cyan bg-vault-cyan/10 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-vault-cyan/20 rounded-bl-full" />
          <p className="font-bold text-vault-cyan tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-vault-cyan inline-block" />
            COMMIT_SUCCESSFUL
          </p>
          {savedHash && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-vault-muted">BLOCKCHAIN_REFERENCE_HASH:</span>
              <span className="text-xs sm:text-sm bg-vault-bg p-3 break-all text-vault-text border border-vault-border/50">
                {savedHash}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import * as React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Headphones, Mic, Lock, Server, CheckCircle, ShieldCheck } from 'lucide-react'
import AudioRecorder from '@/components/AudioRecorder'
import NoteList from '@/components/NoteList'

export default function Home() {
  return (
    <main id="home" className="min-h-screen relative bg-brand-bg text-brand-text font-sans selection:bg-brand-primary selection:text-white">
      
      {/* Soft Glow Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

      {/* Navigation */}
      <header className="fixed top-0 left-0 w-full flex justify-between items-center p-6 border-b border-brand-border bg-brand-bg/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <div className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
            <Headphones className="w-6 h-6 text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            Dhwani
          </div>
        </div>
        <div className="hidden md:flex gap-8 text-sm text-brand-muted font-medium">
          <a href="#home" className="hover:text-white transition-colors relative group">
            Home
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-500 transition-all group-hover:w-full rounded-full"></span>
          </a>
          <a href="#how-it-works" className="hover:text-white transition-colors relative group">
            How it Works
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-500 transition-all group-hover:w-full rounded-full"></span>
          </a>
          <a href="#record" className="hover:text-white transition-colors relative group">
            Record
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-500 transition-all group-hover:w-full rounded-full"></span>
          </a>
          <a href="#vault" className="hover:text-white transition-colors relative group">
            Vault
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-500 transition-all group-hover:w-full rounded-full"></span>
          </a>
        </div>
        <div>
          <ConnectButton />
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 w-full min-h-[70vh] flex flex-col justify-center items-center px-6 md:px-12 pt-32 pb-20 text-center">
        <div className="max-w-3xl flex flex-col items-center">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full border border-brand-border bg-brand-surface text-xs font-medium text-brand-muted shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Powered by Ritual Network
          </div>
          
          <h1 className="font-bold text-5xl md:text-7xl leading-tight mb-6 tracking-tight text-white">
            Secure Voice <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Vault.</span>
          </h1>
          
          <p className="text-brand-muted text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
            End-to-end encrypted audio transmission anchored directly on the Ritual Coprocessor. 
            Tamper-proof, AI-ready, and verifiable.
          </p>
          
          <a href="#record">
            <button className="px-8 py-3 rounded-lg font-medium text-white primary-gradient hover:opacity-90 transition-opacity shadow-[0_4px_20px_rgba(99,102,241,0.4)]">
              Start Recording
            </button>
          </a>
        </div>
      </section>

      {/* Record App Section */}
      <section id="record" className="relative z-10 w-full px-6 md:px-12 py-24 flex justify-center border-t border-brand-border bg-brand-bg">
        <div className="w-full max-w-3xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">Record Audio</h2>
            <p className="text-brand-muted">Capture and encrypt your voice securely.</p>
          </div>
          <AudioRecorder />
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="relative z-10 w-full px-6 md:px-12 py-24 flex justify-center border-t border-brand-border bg-brand-surface/10">
        <div className="w-full max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">How Dhwani Works</h2>
            <p className="text-brand-muted max-w-2xl mx-auto text-lg">A seamless, verifiable protocol for decentralized audio encryption and storage.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: Mic, title: "1. Capture", desc: "Record audio locally in your browser. Audio data never leaves your device unencrypted." },
              { icon: Lock, title: "2. Encrypt", desc: "Your audio is encrypted using ECIES. Only the intended recipient keys can decrypt it." },
              { icon: Server, title: "3. Decentralize", desc: "The encrypted payload is sent to the Ritual Network Coprocessor via smart contracts." },
              { icon: ShieldCheck, title: "4. Verify", desc: "Retrieve your audio anytime with the content verification hash or transaction hash." }
            ].map((step, idx) => (
              <div key={idx} className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center hover:scale-105 hover:-translate-y-2 hover:border-indigo-500/50 transition-all duration-300 cursor-default group">
                <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all duration-300">
                  <step.icon className="w-8 h-8 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vault App Section */}
      <section id="vault" className="relative z-10 w-full px-6 md:px-12 py-24 flex justify-center border-t border-brand-border bg-brand-surface/30">
        <div className="w-full max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">Your Vault</h2>
            <p className="text-brand-muted">Access and verify your encrypted recordings.</p>
          </div>
          <NoteList />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-brand-border bg-brand-surface pt-16 pb-8 px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          <div>
            <div className="font-bold text-xl tracking-tight text-white flex items-center gap-2 mb-4">
              <Headphones className="w-5 h-5 text-indigo-500" />
              Dhwani
            </div>
            <p className="text-brand-muted text-sm max-w-sm">
              Secure communication protocol operating on the Ritual Coprocessor Testnet.
            </p>
          </div>
          <div className="md:text-right">
            <h4 className="font-semibold text-white mb-4">Network Status</h4>
            <ul className="space-y-2 text-sm text-brand-muted">
              <li>Chain ID: 1979</li>
              <li>Encryption: ECIES / Ed25519</li>
              <li className="flex items-center md:justify-end gap-2">
                Status: <span className="flex items-center gap-1.5 text-brand-success"><div className="w-2 h-2 rounded-full bg-brand-success" /> Online</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-brand-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-brand-muted">
          <p>© {new Date().getFullYear()} Dhwani Protocol.</p>
          <p>Powered by Ritual Network.</p>
        </div>
      </footer>
    </main>
  )
}

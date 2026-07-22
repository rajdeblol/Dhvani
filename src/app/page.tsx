'use client'

import * as React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import AudioRecorder from '@/components/AudioRecorder'
import NoteList from '@/components/NoteList'

export default function Home() {
  return (
    <main className="min-h-screen relative bg-vault-bg text-vault-text font-space selection:bg-vault-cyan selection:text-vault-bg">
      {/* High-Tech Grid Background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--color-vault-border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--color-vault-border) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)'
        }}
      />

      {/* Navigation */}
      <header className="fixed top-0 left-0 w-full flex justify-between items-center p-6 border-b border-vault-cyan/20 bg-vault-bg/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-vault-cyan animate-pulse-ring" />
          <div className="font-space font-bold text-xl tracking-widest text-vault-cyan">
            DHVANI // ENCLAVE
          </div>
        </div>
        <div className="hidden md:flex gap-8 font-mono text-sm text-vault-muted tracking-wider">
          <a href="#record" className="hover:text-vault-cyan transition-colors">/record</a>
          <a href="#vault" className="hover:text-vault-cyan transition-colors">/vault</a>
        </div>
        <div>
          <ConnectButton />
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 w-full min-h-[70vh] flex flex-col justify-center px-6 md:px-12 pt-32 pb-20">
        <div className="max-w-4xl">
          <h1 className="font-space font-bold text-5xl md:text-7xl leading-tight mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-vault-text to-vault-muted">
              SECURE CRYPTOGRAPHIC
            </span>
            <br />
            <span className="text-vault-cyan text-shadow-glow">VOICE VAULT.</span>
          </h1>
          
          <p className="font-mono text-vault-muted text-lg max-w-2xl leading-relaxed mb-10 border-l-2 border-vault-magenta pl-6">
            End-to-end encrypted audio transmission anchored on the Ritual Network. 
            Tamper-proof, decentralized, and mathematically guaranteed.
          </p>
          
          <a href="#record">
            <button className="relative overflow-hidden border border-vault-cyan/50 bg-vault-panel px-8 py-4 font-mono font-bold tracking-widest text-vault-cyan transition-all hover:bg-vault-cyan/10 hover:border-vault-cyan hover:shadow-[0_0_20px_rgba(0,229,255,0.3)]">
              INITIALIZE_RECORDING
            </button>
          </a>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-vault-cyan/30 to-transparent" />

      {/* Record App Section */}
      <section id="record" className="relative z-10 w-full px-6 md:px-12 py-32 flex justify-center">
        <div className="w-full max-w-3xl">
          <div className="mb-8 font-mono text-vault-cyan text-sm tracking-widest flex items-center gap-4">
            <span className="w-12 h-px bg-vault-cyan" />
            MODULE_01: ACQUISITION
          </div>
          <AudioRecorder />
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-vault-magenta/30 to-transparent" />

      {/* Vault App Section */}
      <section id="vault" className="relative z-10 w-full px-6 md:px-12 py-32 flex justify-center">
        <div className="w-full max-w-5xl">
          <div className="mb-8 font-mono text-vault-magenta text-sm tracking-widest flex items-center gap-4">
            <span className="w-12 h-px bg-vault-magenta" />
            MODULE_02: DECRYPTION_LEDGER
          </div>
          <NoteList />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-vault-border bg-vault-panel/50 pt-16 pb-8 px-6 md:px-12 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          <div>
            <h3 className="font-space font-bold text-2xl text-vault-cyan mb-4">DHVANI // SYSTEM</h3>
            <p className="font-mono text-vault-muted text-sm">Encrypted communication protocol operating on Ritual Testnet.</p>
          </div>
          <div>
            <h4 className="font-mono font-bold text-vault-text mb-4">NODE_INFO</h4>
            <ul className="space-y-2 font-mono text-sm text-vault-muted">
              <li>Network: Ritual Testnet</li>
              <li>Chain_ID: 1979</li>
              <li>Status: <span className="text-green-400">ONLINE</span></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-vault-border pt-8 flex justify-between font-mono text-xs text-vault-muted">
          <p>SYS.DATE: {new Date().getFullYear()}</p>
          <p>ENCRYPTION: ECIES / ED25519</p>
        </div>
      </footer>
    </main>
  )
}

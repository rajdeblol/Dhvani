'use client'

import * as React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import AudioRecorder from '@/components/AudioRecorder'
import NoteList from '@/components/NoteList'

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-brand-base text-brand-primary animate-slide-up">
      {/* Animated Gradient Blobs */}
      <div className="absolute top-0 left-0 w-full h-screen overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-brand-orange mix-blend-multiply filter blur-[140px] opacity-70 animate-blob-pulse" style={{ animationDelay: '0s' }} />
        <div className="absolute top-[20%] right-[10%] w-[50vw] h-[50vw] rounded-full bg-brand-red mix-blend-multiply filter blur-[140px] opacity-70 animate-blob-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navigation */}
      <header className="fixed top-0 left-0 w-full flex justify-between items-center p-6 md:p-10 z-50 mix-blend-difference text-brand-base">
        <div className="font-clash font-bold text-2xl tracking-tighter uppercase">
          DHVANI/RAW
        </div>
        <div className="hidden md:flex gap-8 font-satoshi font-medium text-[14px] tracking-[0.1em] uppercase">
          <a href="#record" className="hover:opacity-70 transition-opacity">Record</a>
          <a href="#vault" className="hover:opacity-70 transition-opacity">Vault</a>
        </div>
        <div className="mix-blend-normal">
          <ConnectButton />
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full min-h-screen flex flex-col justify-center px-6 md:px-12 pt-32 pb-20">
        <h1 className="font-clash font-bold text-[18vw] leading-[0.75] tracking-[-0.05em] uppercase text-brand-primary mix-blend-multiply">
          VOICE <br />
          <span className="ml-[15vw]">VAULT.</span>
        </h1>
        
        <div className="mt-16 md:mt-24 max-w-[400px] flex flex-col gap-8 ml-[5vw] md:ml-[15vw]">
          <p className="font-satoshi text-[20px] leading-relaxed text-brand-primary font-medium">
            Functionality stripped to its core. <br />
            No excess. Just pure cryptographic verification for the modern nomad.
          </p>
          
          <a href="#record" className="inline-block">
            <button className="group relative overflow-hidden bg-brand-primary text-brand-base px-8 py-4 font-satoshi font-bold tracking-widest uppercase text-sm w-fit transition-colors duration-300 hover:text-brand-red">
              <span className="absolute inset-0 bg-white transform -translate-x-full transition-transform duration-300 ease-out group-hover:translate-x-0" />
              <span className="relative z-10">Start Recording</span>
            </button>
          </a>
        </div>
      </section>

      {/* Category Divider - Record */}
      <section id="record" className="w-full pt-32 pb-16 px-6 md:px-12 border-t border-brand-primary/10 relative">
        <div className="absolute inset-0 bg-brand-orange/5 pointer-events-none" />
        <h2 className="font-clash font-bold text-[12vw] leading-[0.8] tracking-tighter uppercase opacity-90 text-brand-primary mix-blend-multiply relative z-10">
          RECORD
        </h2>
      </section>

      {/* Record App Section */}
      <section className="w-full px-6 md:px-12 pb-32">
        <div className="max-w-4xl border border-brand-primary bg-brand-base p-8 md:p-12 shadow-[16px_16px_0_0_#1E1E1E] transition-all hover:shadow-[8px_8px_0_0_#1E1E1E] hover:translate-x-2 hover:translate-y-2">
          <AudioRecorder />
        </div>
      </section>

      {/* Category Divider - Vault */}
      <section id="vault" className="w-full pt-32 pb-16 px-6 md:px-12 border-t border-brand-primary/10 relative text-right">
        <div className="absolute inset-0 bg-brand-red/5 pointer-events-none" />
        <h2 className="font-clash font-bold text-[12vw] leading-[0.8] tracking-tighter uppercase opacity-90 text-brand-primary mix-blend-multiply relative z-10">
          VAULT
        </h2>
      </section>

      {/* Vault App Section */}
      <section className="w-full px-6 md:px-12 pb-32">
        <div className="max-w-7xl mx-auto">
          <NoteList />
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-brand-primary text-brand-base pt-24 pb-8 px-6 md:px-12 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-32">
          <div className="md:col-span-2">
            <h3 className="font-clash font-bold text-4xl uppercase tracking-tighter mb-6">DHVANI/RAW</h3>
            <p className="font-satoshi text-brand-base/70 max-w-sm">Decentralized, privacy-first audio verification on the Ritual Network.</p>
          </div>
          <div>
            <h4 className="font-satoshi font-bold uppercase tracking-widest text-xs text-brand-base/50 mb-6">Navigation</h4>
            <ul className="space-y-4 font-satoshi text-sm">
              <li><a href="#" className="hover:text-brand-red transition-colors">Home</a></li>
              <li><a href="#record" className="hover:text-brand-red transition-colors">Record</a></li>
              <li><a href="#vault" className="hover:text-brand-red transition-colors">Vault</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-satoshi font-bold uppercase tracking-widest text-xs text-brand-base/50 mb-6">Network</h4>
            <ul className="space-y-4 font-satoshi text-sm text-brand-base/70">
              <li>Ritual Testnet</li>
              <li>Chain ID: 1979</li>
            </ul>
          </div>
        </div>
        
        <div className="relative border-t border-brand-base/20 pt-8 flex justify-between items-end">
          <p className="font-satoshi text-sm text-brand-base/50">© 2024 DHVANI. ALL RIGHTS RESERVED.</p>
          <div className="absolute bottom-0 right-0 font-clash font-bold text-[15vw] leading-none text-white/5 pointer-events-none tracking-tighter">
            2024
          </div>
        </div>
      </footer>
    </main>
  )
}

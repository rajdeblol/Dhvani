'use client'

import * as React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import AudioRecorder from '@/components/AudioRecorder'
import NoteList from '@/components/NoteList'

export default function Home() {
  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto space-y-12">
      <header className="flex justify-between items-center border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            Dhvani
          </h1>
          <p className="text-zinc-400 mt-2">Privacy-First Verifiable Voice Vault</p>
        </div>
        <ConnectButton />
      </header>

      <div className="grid md:grid-cols-2 gap-8">
        <section className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800/50">
          <h2 className="text-xl font-semibold mb-6">Record New Note</h2>
          <AudioRecorder />
        </section>

        <section className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800/50">
          <h2 className="text-xl font-semibold mb-6">Your Notes</h2>
          <NoteList />
        </section>
      </div>
    </main>
  )
}

import { computeAudioHash, getOrCreateKeys } from './src/lib/crypto.ts'

async function run() {
  try {
    const keys = getOrCreateKeys()
    console.log("Keys generated:", keys)
  } catch (e) {
    console.error("Error:", e)
  }
}

run()

import { getPublicKey, sign, hashes } from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha2.js'
import { PrivateKey } from 'eciesjs'
import { keccak256, toHex, stringToHex } from 'viem'
import { Buffer } from 'buffer'

// Configure sha512 for noble-ed25519 v3
hashes.sha512 = sha512

export async function computeAudioHash(buffer: ArrayBuffer): Promise<`0x${string}`> {
  const hexString = toHex(new Uint8Array(buffer))
  return keccak256(hexString)
}

export function getOrCreateKeys() {
  let edPriv = localStorage.getItem('dhvani_ed25519_priv')
  let eciesPrivHex = localStorage.getItem('dhvani_ecies_priv')

  if (!edPriv || !eciesPrivHex) {
    // Generate new Ed25519 keypair (32 random bytes)
    const newEdPriv = new Uint8Array(32)
    window.crypto.getRandomValues(newEdPriv)
    edPriv = toHex(newEdPriv)
    localStorage.setItem('dhvani_ed25519_priv', edPriv)

    // Generate new ECIES keypair
    const newEciesPriv = new PrivateKey()
    eciesPrivHex = newEciesPriv.toHex()
    localStorage.setItem('dhvani_ecies_priv', eciesPrivHex)
  }

  const edPrivBytes = Buffer.from(edPriv.replace('0x', ''), 'hex')
  const eciesPriv = PrivateKey.fromHex(eciesPrivHex)

  return {
    edPriv: edPrivBytes,
    eciesPriv,
    edPub: getPublicKey(edPrivBytes),
    eciesPub: eciesPriv.publicKey
  }
}

export async function signHash(hashHex: `0x${string}`, privKey: Uint8Array): Promise<`0x${string}`> {
  const msgBytes = Buffer.from(hashHex.replace('0x', ''), 'hex')
  const sig = await sign(msgBytes, privKey)
  return toHex(sig)
}

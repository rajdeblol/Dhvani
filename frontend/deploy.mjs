import { createWalletClient, http, publicActions } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { defineChain } from 'viem'
import fs from 'fs'

const ritualChain = defineChain({
  id: 1979,
  name: 'Ritual Testnet',
  network: 'ritual-testnet',
  nativeCurrency: { name: 'Ritual', symbol: 'RITUAL', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.ritualfoundation.org'] },
    public: { http: ['https://rpc.ritualfoundation.org'] },
  }
})

async function main() {
  const account = privateKeyToAccount('0x0ed37fabd42fc6e1b515f8eef8041e7e48f7fe0ebd4b03a3cc8d00768762a1d9')
  const client = createWalletClient({
    account,
    chain: ritualChain,
    transport: http()
  }).extend(publicActions)

  console.log('Deploying from:', account.address)
  
  const balance = await client.getBalance({ address: account.address })
  console.log('Balance:', balance.toString())

  if (balance === 0n) {
    console.log('Wait, balance is 0. Please send testnet ETH to', account.address)
    process.exit(1)
  }

  const abi = JSON.parse(fs.readFileSync('abi.json', 'utf8'))
  const bytecode = fs.readFileSync('bytecode.txt', 'utf8').trim()

  console.log('Sending deployment transaction...')
  const hash = await client.deployContract({
    abi,
    bytecode: bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`,
  })

  console.log('Tx Hash:', hash)
  
  const receipt = await client.waitForTransactionReceipt({ hash })
  console.log('Contract Deployed at:', receipt.contractAddress)
}

main().catch(console.error)

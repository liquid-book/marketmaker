import { Wallet, WebSocketProvider } from 'ethers'

export const getWsProvider = async (): Promise<WebSocketProvider> => {
  return new WebSocketProvider(process.env.RPC_WSS ?? '')
}

export const getMMWallet = async (): Promise<Wallet> => {
  return new Wallet(process.env.OWNER_PRIVATE_KEY ?? '', await getWsProvider())
}

import { ArweaveWalletApi } from '../shared-components/Leaderboard/types/arconnect';

declare global {
  interface Window {
    arweaveWallet: ArweaveWalletApi;
  }
}

export {};

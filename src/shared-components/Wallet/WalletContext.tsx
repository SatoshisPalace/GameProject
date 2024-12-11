import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BazarProfile } from './types';
import { dryrun } from '../../config/aoConnection';
import { checkBazarProfile } from './utils/bazarProfile';

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  bazarProfile: BazarProfile | null;
  connect: () => Promise<string>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [bazarProfile, setBazarProfile] = useState<BazarProfile | null>(null);

  const handleConnect = async () => {
    if (window.arweaveWallet) {
      try {
        await window.arweaveWallet.connect(['ACCESS_ADDRESS', 'SIGN_TRANSACTION']);
        const addr = await window.arweaveWallet.getActiveAddress();
        if (addr) {
          setAddress(addr);
          setIsConnected(true);
          const profile = await checkBazarProfile(addr);
          setBazarProfile(profile);
          return addr;
        }
        throw new Error('No address returned from wallet');
      } catch (error) {
        console.error('Error connecting wallet:', error);
        throw error;
      }
    }
    throw new Error('Arweave wallet not found');
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setAddress(null);
    setBazarProfile(null);
  };

  // Check for existing connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (window.arweaveWallet) {
        try {
          const permissions = await window.arweaveWallet.getPermissions();
          if (permissions.includes('ACCESS_ADDRESS')) {
            const addr = await window.arweaveWallet.getActiveAddress();
            if (addr) {
              setAddress(addr);
              setIsConnected(true);
              const profile = await checkBazarProfile(addr);
              setBazarProfile(profile);
            }
          }
        } catch (error) {
          console.error('Error checking existing connection:', error);
        }
      }
    };

    checkExistingConnection();
  }, []);

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        bazarProfile,
        connect: handleConnect,
        disconnect: handleDisconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BazarProfile } from './types';
import { connect } from "@permaweb/aoconnect";

const { dryrun } = connect({
  MU_URL: "https://mu.ao-testnet.xyz",
  CU_URL: "https://cu.ao-testnet.xyz",
  GATEWAY_URL: "https://arweave.net",
});

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

  const checkBazarProfile = async (address: string, retryCount = 0): Promise<BazarProfile | null> => {
    try {
      console.log("=== Starting Bazar profile check ===", { retryCount });
      console.log("Looking for bazar profile for wallet:", address);
      const BAZAR_PROCESS = "SNy4m-DrqxWl01YqGM4sxI8qCni-58re8uuJLvZPypY";
      
      const profileResult = await dryrun({
        process: BAZAR_PROCESS,
        data: JSON.stringify({
          Address: address
        }),
        tags: [
          { name: "Action", value: "Get-Profiles-By-Delegate" },
        ]
      });

      if (!profileResult?.Messages?.length && retryCount < 3) {
        console.log(`No content received, retrying in 1 second... (attempt ${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return checkBazarProfile(address, retryCount + 1);
      }

      if (profileResult?.Messages?.[0]?.Data) {
        try {
          const profileData = JSON.parse(profileResult.Messages[0].Data);
          if (Array.isArray(profileData) && profileData.length > 0 && profileData[0].ProfileId) {
            const profileId = profileData[0].ProfileId;
            console.log("Found ProfileId:", profileId);

            const infoResult = await dryrun({
              process: profileId,
              data: JSON.stringify({
                ProfileId: profileId
              }),
              tags: [
                { name: "Action", value: "Info" },
              ]
            });

            if (infoResult?.Messages?.[0]?.Data) {
              const profileInfo = JSON.parse(infoResult.Messages[0].Data);
              const profile = profileInfo?.Profile;
              if (profile?.DisplayName) {
                console.log('Found Bazar Profile Display Name:', profile.DisplayName);
                return profile;
              }
            }
          }
        } catch (parseError) {
          console.error('Error parsing profile data:', parseError);
        }
      }
    } catch (profileError) {
      console.error('Error checking Bazar profile:', profileError);
    }
    return null;
  };

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

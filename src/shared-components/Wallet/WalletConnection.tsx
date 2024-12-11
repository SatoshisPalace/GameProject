import React, { useState } from 'react';
import styled from 'styled-components';
import { dryrun } from '../../config/aoConnection';
import { useWallet } from './WalletContext';
import UserProfile from '../UserProfile/UserProfile';

const WalletContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const WalletButton = styled.button`
  background: rgba(108, 92, 231, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.8rem 1.5rem;
  border-radius: 12px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  font-weight: 500;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(108, 92, 231, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 6px 8px rgba(0, 0, 0, 0.2);
  }

  &:disabled {
    background: rgba(168, 168, 168, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

interface WalletConnectionProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  isConnected?: boolean;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({
  onConnect,
  onDisconnect,
  isConnected: externalIsConnected,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { 
    isConnected: contextIsConnected, 
    connect: contextConnect, 
    disconnect: contextDisconnect,
    address,
    bazarProfile
  } = useWallet();

  // Use external isConnected prop if provided, otherwise use context value
  const isConnected = typeof externalIsConnected !== 'undefined' ? externalIsConnected : contextIsConnected;

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const address = await contextConnect();
      onConnect?.(address);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    contextDisconnect();
    onDisconnect?.();
  };

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
  };

  return (
    <WalletContainer>
      {!isConnected ? (
        <WalletButton onClick={handleConnect} disabled={isLoading}>
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </WalletButton>
      ) : (
        <>
          {address && (
            <UserProfile 
              address={address}
              bazarProfile={bazarProfile}
              onCopyAddress={handleCopyAddress}
            />
          )}
          <WalletButton onClick={handleDisconnect}>
            Disconnect
          </WalletButton>
        </>
      )}
    </WalletContainer>
  );
};

export default WalletConnection;
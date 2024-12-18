import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { BazarProfile } from '../Wallet/types';
import { checkBazarProfile } from '../Wallet/utils/bazarProfile';
import { gatewayUrl } from '../Constants';

interface UserProfileProps {
  address: string;
  bazarProfile?: BazarProfile | null;
  onCopyAddress?: (address: string) => void;
}

const UserInfoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
`;

const ProfileImage = styled.div<{ imageUrl?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${props => props.imageUrl ? `url(${props.imageUrl})` : '#2a2a2a'};
  background-size: cover;
  background-position: center;
  border: 2px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  
  &::after {
    content: '';
    display: ${props => props.imageUrl ? 'none' : 'block'};
    width: 24px;
    height: 24px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }
`;

const NameAndAddressContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const PlayerNameAndWallet = styled.div`
  font-size: 1.1em;
  font-weight: 600;
  color: #fff;
`;

const WalletAddress = styled.div`
  font-size: 0.9em;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: rgba(255, 255, 255, 0.8);
  }
`;

const LoadingDot = styled.div`
  font-size: 0.9em;
  color: rgba(255, 255, 255, 0.6);
`;

const UserProfile: React.FC<UserProfileProps> = ({ 
  address, 
  bazarProfile: providedBazarProfile, 
  onCopyAddress = (addr: string) => {
    console.log("[USER_PROFILE] Copying to clipboard:", addr);
    navigator.clipboard.writeText(addr);
  }
}) => {
  const [fetchedBazarProfile, setFetchedBazarProfile] = useState<BazarProfile | null>(null);
  const [isLoading, setIsLoading] = useState(!providedBazarProfile);
  const bazarProfile = providedBazarProfile ?? fetchedBazarProfile;

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      if (!providedBazarProfile) {
        setIsLoading(true);
        try {
          console.log('[USER_PROFILE] Fetching profile for address:', address);
          const profile = await checkBazarProfile(address);
          console.log('[USER_PROFILE] Fetched profile:', profile);
          if (isMounted) {
            setFetchedBazarProfile(profile);
            setIsLoading(false);
          }
        } catch (error) {
          console.error('[USER_PROFILE] Error fetching Bazar profile:', error);
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [address, providedBazarProfile]);

  const imageUrl = bazarProfile?.ProfileImage ? 
    `${gatewayUrl}${bazarProfile.ProfileImage}` : 
    undefined;

  return (
    <UserInfoContainer>
      <ProfileImage imageUrl={imageUrl} />
      <NameAndAddressContainer>
        <PlayerNameAndWallet>
          {isLoading ? (
            <LoadingDot>Loading...</LoadingDot>
          ) : (
            bazarProfile?.DisplayName || 'Anon'
          )}
        </PlayerNameAndWallet>
        <WalletAddress onClick={() => onCopyAddress(address)}>
          {address.slice(0, 3)}...{address.slice(-3)}
        </WalletAddress>
        {bazarProfile?.ProfileId && (
          <WalletAddress onClick={() => {
            console.log("[USER_PROFILE] Copying ProfileId:", bazarProfile.ProfileId);
            onCopyAddress(bazarProfile.ProfileId!);
          }}>
            ID: {bazarProfile.ProfileId!.slice(0, 3)}...{bazarProfile.ProfileId!.slice(-3)}
          </WalletAddress>
        )}
      </NameAndAddressContainer>
    </UserInfoContainer>
  );
};

export default UserProfile;

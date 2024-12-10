import React from 'react';
import styled from 'styled-components';
import WalletConnection from '../Wallet/WalletConnection';
import Leaderboard from '../Leaderboard/components/Leaderboard';
import { useWallet } from '../Wallet/WalletContext';

const HUDContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  z-index: 1000;
`;

const Score = styled.div`
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  color: #6c5ce7;
  font-size: 36px;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(108, 92, 231, 0.5);
  background: rgba(0, 0, 0, 0.8);
  padding: 15px 30px;
  border-radius: 15px;
  border: 2px solid #6c5ce7;
  box-shadow: 0 0 20px rgba(108, 92, 231, 0.3);
`;

const Logo = styled.img`
  height: 50px;
  width: auto;
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
`;

const WalletContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
`;

interface HUDProps {
  score: number;
  gameId: string;
  logoSrc?: string;
}

const HUD: React.FC<HUDProps> = ({ score, gameId, logoSrc = "/crown.avif" }) => {
  const { address } = useWallet();

  return (
    <>
      <HUDContainer>
        <Logo src={logoSrc} alt="Game Logo" />
        <WalletContainer>
          <WalletConnection />
        </WalletContainer>
        <Leaderboard gameId={gameId} />
      </HUDContainer>
      <Score>Score: {score}</Score>
    </>
  );
};

export default HUD;

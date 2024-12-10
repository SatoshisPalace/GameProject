import React from 'react';
import styled from 'styled-components';
import App from './blob-game/src/App';

const GameContainer = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #000;
  color: white;
  position: relative;
`;

interface BlobGameProps {
  walletAddress?: string;
  isWalletConnected: boolean;
}

const BlobGame: React.FC<BlobGameProps> = ({ walletAddress, isWalletConnected }) => {
  return (
    <GameContainer>
      <App />
    </GameContainer>
  );
};

export default BlobGame;

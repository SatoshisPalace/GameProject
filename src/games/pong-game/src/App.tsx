import React, { useState } from 'react';
import styled from 'styled-components';
import Game from './components/Game';
import HUD from './components/HUD';
import { submitScore } from '../../../shared-components/Leaderboard/utils/leaderboard';
import { WalletProvider } from '../../../shared-components/Wallet/WalletContext';

const AppContainer = styled.div`
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

const App: React.FC = () => {
  const [currentScore, setCurrentScore] = useState(0);
  const [currentWalletAddress, setCurrentWalletAddress] = useState<string>('');
  const [isSavingScore, setIsSavingScore] = useState(false);

  const handleScoreUpdate = (score: number) => {
    setCurrentScore(score);
  };

  const handleWalletConnect = (address: string) => {
    console.log('Wallet connected in Tetris App:', address);
    setCurrentWalletAddress(address);
  };

  const handleGameOver = async () => {
    console.log('Game Over in Tetris App - Current Score:', currentScore);
    console.log('Current wallet address:', currentWalletAddress);
    
    if (!currentWalletAddress) {
      console.log('No wallet connected, skipping score submission');
      return;
    }

    if (!window.arweaveWallet) {
      console.log('ArweaveWallet not found, skipping score submission');
      return;
    }

    setIsSavingScore(true);
    try {
      console.log('Submitting score to AO process...');
      const result = await submitScore(
        window.arweaveWallet,
        'TETRIS',
        currentScore
      );
      console.log('Score submitted successfully:', result);
    } catch (error) {
      console.error('Error saving score:', error);
    } finally {
      setIsSavingScore(false);
    }
  };

  return (
    <AppContainer>
      <WalletProvider>
      <HUD 
        score={currentScore}
      />
      <Game 
        onScoreUpdate={handleScoreUpdate}
        onGameOver={handleGameOver}
      />
      </WalletProvider>
    </AppContainer>
  );
};

export default App;

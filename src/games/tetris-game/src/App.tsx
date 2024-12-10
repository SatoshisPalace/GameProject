import React, { useState } from 'react';
import styled from 'styled-components';
import { WalletProvider, useWallet } from '../../../shared-components/Wallet/WalletContext';
import Game from './components/Game';
// import HUD from './components/HUD';
import  HUD  from '../../../shared-components/HUD/HUD';
import { submitScore } from '../../../shared-components/Leaderboard/utils/leaderboard';

const AppContainer = styled.div`
  width: fit-content;
  height: fit-content;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: white;
  position: relative;
  margin: 0 auto;
`;

const GameContent: React.FC = () => {
  const [currentScore, setCurrentScore] = useState(0);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const { address } = useWallet();

  const handleScoreUpdate = (score: number) => {
    setCurrentScore(score);
  };

  const handleGameOver = async (finalScore: number) => {
    console.log('Game Over - Current Score:', finalScore);
    
    if (!address) {
      console.log('No wallet connected, skipping score submission');
      return;
    }

    setIsSavingScore(true);
    try {
      console.log('Submitting score to AO process...');
      const result = await submitScore({ address }, 'TETRIS', finalScore);
      console.log('Score submitted successfully:', result);
    } catch (error) {
      console.error('Error saving score:', error);
    } finally {
      setIsSavingScore(false);
    }
  };

  const handleRestart = () => {
    setCurrentScore(0);
    setGameKey(prev => prev + 1);
  };

  return (
    <AppContainer>
      <HUD score={currentScore} gameId={'TETRIS'} />
      <Game 
        key={gameKey}
        onScoreUpdate={handleScoreUpdate}
        onGameOver={handleGameOver}
        onRestart={handleRestart}
      />
    </AppContainer>
  );
};

const App: React.FC = () => {
  return (
    <WalletProvider>
      <GameContent />
    </WalletProvider>
  );
};

export default App;

import React, { useState } from 'react';
import styled from 'styled-components';
import Game from './components/Game';
import HUD from '../../../shared-components/HUD/HUD';
import { WalletProvider } from '../../../shared-components/Wallet/WalletContext';
import { ScoreProvider, useScore } from '../../../shared-components/Score/ScoreContext';

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

const GameContent: React.FC = () => {
  const { currentScore, updateScore, handleGameOver } = useScore();
  const [gameKey, setGameKey] = useState(0);

  const handleScoreUpdate = (score: number) => {
    updateScore(score);
  };

  const handleGameFinish = async (finalScore: number) => {
    await handleGameOver('PONG', finalScore);
  };

  const handleRestart = () => {
    setGameKey(prev => prev + 1);
  };

  return (
    <AppContainer>
      <HUD score={currentScore} gameId="PONG" />
      <Game
        key={gameKey}
        onScoreUpdate={handleScoreUpdate}
        onGameOver={handleGameFinish}
        onRestart={handleRestart}
      />
    </AppContainer>
  );
};

const App: React.FC = () => {
  return (
    <WalletProvider>
      <ScoreProvider>
        <GameContent />
      </ScoreProvider>
    </WalletProvider>
  );
};

export default App;

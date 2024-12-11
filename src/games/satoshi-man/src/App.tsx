import React, { useState } from 'react';
import styled from 'styled-components';
import { WalletProvider } from '../../../shared-components/Wallet/WalletContext';
import { ScoreProvider, useScore } from '../../../shared-components/Score/ScoreContext';
import Game from './components/Game';
import HUD from '../../../shared-components/HUD/HUD';

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
  const [gameKey, setGameKey] = useState(0);
  const { currentScore, updateScore, handleGameOver } = useScore();

  const handleScoreUpdate = (score: number) => {
    updateScore(score);
  };

  const handleGameFinish = async (finalScore: number) => {
    await handleGameOver('SATOSHI', finalScore);
  };

  const handleRestart = () => {
    setGameKey(prev => prev + 1);
  };

  return (
    <AppContainer>
      <HUD score={currentScore} gameId="SATOSHI" />
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

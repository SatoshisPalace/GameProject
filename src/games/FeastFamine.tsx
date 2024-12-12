import React, { useState } from 'react';
import styled from 'styled-components';
import HUD from '../shared-components/HUD/HUD';
import { useWallet } from '../shared-components/Wallet/WalletContext';
import { ScoreProvider, useScore } from '../shared-components/Score/ScoreContext';
import Game from './blob-game/src/components/Game';

const GameWrapper = styled.div`
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
  onLeave?: () => void;
  gameId: string;
}

interface GameContentProps {
  gameId: string;
}

const GameContent: React.FC<GameContentProps> = ({ gameId }) => {
  const [gameKey, setGameKey] = useState(0);
  const { currentScore, updateScore, handleGameOver } = useScore();
  const { address, bazarProfile } = useWallet();

  const handleGameFinish = async (finalScore: number) => {
    console.log('Game Over - Final Score:', finalScore);
    if (address) {
      try {
        await handleGameOver(gameId, finalScore);
        // Auto restart after game over
        setGameKey(prev => prev + 1);
        updateScore(0);
      } catch (error) {
        console.error('Error handling game over:', error);
      }
    } else {
      console.log('No wallet connected, skipping score submission');
    }
  };

  return (
    <GameWrapper>
      <HUD score={currentScore} gameId={gameId} />
      <Game
        key={gameKey}
        onGameOver={handleGameFinish}
      />
    </GameWrapper>
  );
};

const BlobGame: React.FC<BlobGameProps> = ({ onLeave, gameId }) => {
  return (
    <ScoreProvider>
      <GameContent gameId={gameId} />
    </ScoreProvider>
  );
};

export default BlobGame;

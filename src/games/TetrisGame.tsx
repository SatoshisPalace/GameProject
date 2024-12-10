import React, { useState } from 'react';
import styled from 'styled-components';
import Game from './tetris-game/src/components/Game';
import  HUD  from '../shared-components/HUD/HUD';
import { submitScore } from '../shared-components/Leaderboard/utils/leaderboard';
import { useWallet } from '../shared-components/Wallet/WalletContext';

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

const TetrisGame: React.FC = () => {
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [transactionId, setTransactionId] = useState<string>('');
  const [gameKey, setGameKey] = useState(0);
  const { address } = useWallet();

  const handleScoreUpdate = (newScore: number) => {
    setScore(newScore);
  };

  const handleGameOver = async (finalScore: number) => {
    setIsGameOver(true);
    
    if (address) {
      setIsSavingScore(true);
      try {
        const result = await submitScore({ address }, 'TETRIS', finalScore);
        setTransactionId(result.id);
        console.log('Score submitted successfully:', result);
      } catch (error) {
        console.error('Error submitting score:', error);
      } finally {
        setIsSavingScore(false);
      }
    }
  };

  const handleRestart = () => {
    setScore(0);
    setIsGameOver(false);
    setTransactionId('');
    setGameKey(prev => prev + 1);
  };

  return (
    <GameWrapper>
      <HUD score={score} gameId={'TETRIS'} />
      <Game
        key={gameKey}
        onScoreUpdate={handleScoreUpdate}
        onGameOver={handleGameOver}
        onRestart={handleRestart}
      />
      {isSavingScore && <div>Saving score...</div>}
      {transactionId && (
        <div>Score saved! Transaction ID: {transactionId}</div>
      )}
    </GameWrapper>
  );
};

export default TetrisGame;

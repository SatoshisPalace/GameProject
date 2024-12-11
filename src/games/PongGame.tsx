import React, { useState } from 'react';
import styled from 'styled-components';
import Game from './pong-game/src/components/Game';
import  HUD  from '../shared-components/HUD/HUD';
import { submitScore } from '../shared-components/Leaderboard/utils/leaderboard';
import { useWallet } from '../shared-components/Wallet/WalletContext';

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

const PongGame: React.FC = () => {
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [transactionId, setTransactionId] = useState<string>('');
  const { address } = useWallet();

  const handleScoreUpdate = (newScore: number) => {
    setScore(newScore);
  };

  const handleGameOver = async (finalScore: number) => {
    setIsGameOver(true);
    console.log('Game Over - Current Address:', address);
    
    if (address) {
      setIsSavingScore(true);
      try {
        const result = await submitScore({ address }, 'PONG', finalScore);
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
  };

  return (
    <GameContainer>
      <HUD score={score} gameId={'PONG'} />
      <Game 
        onScoreUpdate={handleScoreUpdate}
        onGameOver={handleGameOver}
        onRestart={handleRestart}
      />
      {isSavingScore && <div>Saving score...</div>}
      {transactionId && (
        <div>Score saved! Transaction ID: {transactionId}</div>
      )}
    </GameContainer>
  );
};

export default PongGame;

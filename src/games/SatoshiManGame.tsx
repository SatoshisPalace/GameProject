import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import Game from './satoshi-man/src/components/Game';
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

const GameWrapper = styled.div`
  width: 100%;
  height: 100%;
`;

const SatoshiManGame: React.FC<{ gameId: string }> = ({ gameId }) => {
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [transactionId, setTransactionId] = useState<string>('');
  const [gameKey, setGameKey] = useState(0);
  const { address } = useWallet();

  const handleScoreUpdate = useCallback((newScore: number) => {
    if (isGameOver) return;
    setScore(newScore);
  }, [isGameOver]);

  const handleGameOver = useCallback(async (finalScore: number) => {
    setIsGameOver(true);
    
    if (address) {
      setIsSavingScore(true);
      try {
        const result = await submitScore({ address }, gameId, finalScore);
        setTransactionId(result.id);
        console.log('Score submitted successfully:', result);
      } catch (error) {
        console.error('Error submitting score:', error);
      } finally {
        setIsSavingScore(false);
      }
    }
  }, [address, gameId]);

  const handleRestart = useCallback(() => {
    setIsGameOver(false);
    setScore(0);
    setTransactionId('');
    setGameKey(prev => prev + 1);
  }, []);

  return (
    <GameContainer>
      <HUD score={score} gameId={gameId} />
      <GameWrapper>
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
    </GameContainer>
  );
};

export default SatoshiManGame;

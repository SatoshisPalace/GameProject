import React, { createContext, useContext, useState, useCallback } from 'react';
import { submitScore } from '../Leaderboard/utils/leaderboard';
import { useWallet } from '../Wallet/WalletContext';

interface ScoreContextType {
  currentScore: number;
  isSavingScore: boolean;
  updateScore: (score: number) => void;
  handleGameOver: (gameId: string, finalScore: number) => Promise<void>;
  resetScore: () => void;
}

const ScoreContext = createContext<ScoreContextType | undefined>(undefined);

export const ScoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScore, setCurrentScore] = useState(0);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const { address, bazarProfile } = useWallet();

  const updateScore = useCallback((score: number) => {
    setCurrentScore(score);
  }, []);

  const resetScore = useCallback(() => {
    setCurrentScore(0);
  }, []);

  const handleGameOver = useCallback(async (gameId: string, finalScore: number) => {
    console.log(`Game Over (${gameId}) - Final Score:`, finalScore);
    
    if (!address) {
      console.log('No wallet connected, skipping score submission');
      return;
    }

    if (finalScore <= 0) {
      console.log('Score is 0 or negative, skipping score submission');
      return;
    }

    setIsSavingScore(true);
    try {
      console.log('Submitting score to AO process...');
      const result = await submitScore({ address }, gameId, finalScore, bazarProfile?.DisplayName);
      console.log('Score submitted successfully:', result);
    } catch (error) {
      console.error('Error saving score:', error);
    } finally {
      setIsSavingScore(false);
    }
  }, [address, bazarProfile]);

  const value = {
    currentScore,
    isSavingScore,
    updateScore,
    handleGameOver,
    resetScore,
  };

  return <ScoreContext.Provider value={value}>{children}</ScoreContext.Provider>;
};

export const useScore = () => {
  const context = useContext(ScoreContext);
  if (context === undefined) {
    throw new Error('useScore must be used within a ScoreProvider');
  }
  return context;
};

import { FC } from 'react';

interface GameProps {
  walletAddress?: string;
  isWalletConnected?: boolean;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => Promise<void>;
}

declare const Game: FC<GameProps>;
export default Game;

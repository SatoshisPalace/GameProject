import React from 'react';
import styled from 'styled-components';

const GameOverOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const GameOverContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 30px;
  color: white;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  width: 80%;
  max-width: 400px;
`;

const GameOverTitle = styled.h2`
  font-size: 2em;
  margin-bottom: 20px;
  color: #fff;
`;

const Score = styled.p`
  margin: 15px 0;
  font-size: 1.2em;
`;

const TransactionStatus = styled.div<{ isLoading?: boolean }>`
  margin-top: 25px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  color: ${props => props.isLoading ? '#ffd700' : '#4CAF50'};
`;

const TransactionLink = styled.a`
  display: inline-block;
  color: #4CAF50;
  text-decoration: none;
  margin-top: 10px;
  padding: 8px 16px;
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 5px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(76, 175, 80, 0.2);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const PlayAgainButton = styled.button<{ disabled?: boolean }>`
  margin-top: 20px;
  padding: 12px 24px;
  font-size: 1.1em;
  background: ${props => props.disabled ? 
    'rgba(102, 102, 102, 0.2)' : 
    'rgba(108, 92, 231, 0.2)'};
  color: white;
  border: 1px solid ${props => props.disabled ? 
    'rgba(102, 102, 102, 0.3)' : 
    'rgba(108, 92, 231, 0.3)'};
  border-radius: 8px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s ease;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  &:hover {
    background: ${props => props.disabled ? 
      'rgba(102, 102, 102, 0.2)' : 
      'rgba(90, 75, 209, 0.3)'};
    transform: ${props => props.disabled ? 'none' : 'translateY(-2px)'};
    box-shadow: ${props => props.disabled ? 
      '0 4px 6px rgba(0, 0, 0, 0.1)' : 
      '0 6px 8px rgba(0, 0, 0, 0.2)'};
  }

  &:active {
    transform: ${props => props.disabled ? 'none' : 'translateY(0)'};
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  margin-right: 10px;
  border: 3px solid #ffd700;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

interface GameOverProps {
  score: number;
  onRestart: () => void;
  isSavingScore: boolean;
  txId?: string;
}

const GameOver: React.FC<GameOverProps> = ({ score, onRestart, isSavingScore, txId }) => {
  return (
    <GameOverOverlay>
      <GameOverContainer>
        <GameOverTitle>Game Over0!</GameOverTitle>
        <Score>Final Score: {score}</Score>
        {(isSavingScore || txId) && (
          <TransactionStatus isLoading={isSavingScore}>
            {isSavingScore ? (
              <>
                <LoadingSpinner />
                Saving score to blockchain...
              </>
            ) : txId ? (
              <>
                Score saved successfully!
                <br />
                <TransactionLink 
                  href={`https://arweave.net/${txId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View the Transaction → {`${txId.slice(0, 4)}...${txId.slice(-4)}`}
                </TransactionLink>
              </>
            ) : null}
          </TransactionStatus>
        )}
        <PlayAgainButton 
          onClick={onRestart} 
          disabled={isSavingScore}
          title={isSavingScore ? "Please wait while saving score..." : "Play Again"}
        >
          {isSavingScore ? 'Saving Score...' : 'Play Again'}
        </PlayAgainButton>
      </GameOverContainer>
    </GameOverOverlay>
  );
};

export default GameOver;

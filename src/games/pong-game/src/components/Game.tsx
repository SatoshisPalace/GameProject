import React, { useEffect, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import GameOver from '../../../../shared-components/Game-over/GameOver';
import Leaderboard from '../../../../shared-components/Leaderboard/components/Leaderboard';
import WalletConnection from '../../../../shared-components/Wallet/WalletConnection';

const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 30px auto 20px;
  width: fit-content;
  position: relative;
`;

const Canvas = styled.canvas`
  border: 2px solid #6c5ce7;
  background-color: black;
  box-shadow: 0 0 20px rgba(108, 92, 231, 0.3);
`;

const HUDContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
`;

const Logo = styled.img`
  width: 40px;
  height: 40px;
  margin-right: 10px;
`;

const LeaderboardWrapper = styled.div`
  margin-bottom: 20px;
`;

const WalletContainer = styled.div`
  margin-bottom: 20px;
  display: flex;
  align-items: center;
`;

const Score = styled.div`
  font-size: 24px;
  font-weight: bold;
  margin-top: 10px;
`;

interface HUDProps {
  score: number;
}

const HUD: React.FC<HUDProps> = ({ score }) => {
  return (
    <>
      <HUDContainer>
        <LeaderboardWrapper>
          <Leaderboard gameId="PONG" />
        </LeaderboardWrapper>
      </HUDContainer>
    </>
  );
};

interface GameProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => Promise<void>;
  onRestart: () => void;
}

const Game: React.FC<GameProps> = ({ onScoreUpdate, onGameOver, onRestart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const scoreRef = useRef(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const GAME_ID = 'pong'; // Add game ID constant

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const PADDLE_HEIGHT = 100;
  const PADDLE_WIDTH = 15;
  const BALL_SIZE = 10;
  const PADDLE_SPEED = 12;
  const INITIAL_BALL_SPEED = 7;
  const MAX_BALL_SPEED = 15;
  const COMPUTER_MAX_SPEED = 7; // Even slower than before
  const COMPUTER_ACCELERATION = 0.15; // Much gentler acceleration
  const PREDICTION_ERROR = 80; // Increased error margin
  const DECISION_DELAY = 200; // Longer reaction time
  const MISTAKE_PROBABILITY = 0.3; // 30% chance to make mistakes

  const gameStateRef = useRef({
    playerPaddle: {
      y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      speed: 0,
      targetY: 0,
    },
    computerPaddle: {
      y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      speed: 0,
      targetY: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      lastUpdateTime: 0,
      lastPredictedY: CANVAS_HEIGHT / 2,
      errorOffset: 0,
      isMakingMistake: false,
      mistakeTimer: 0,
      confidenceLevel: 1.0, // How accurate the computer is (varies over time)
    },
    ball: {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      dx: INITIAL_BALL_SPEED,
      dy: INITIAL_BALL_SPEED,
      speed: INITIAL_BALL_SPEED,
    },
    keys: {
      ArrowUp: false,
      ArrowDown: false,
    },
    lastUpdate: 0,
  });

  const predictBallY = () => {
    const { ball, computerPaddle } = gameStateRef.current;
    
    // If making a mistake, return a deliberately wrong prediction
    if (computerPaddle.isMakingMistake) {
      const wrongDirection = Math.random() > 0.5 ? 1 : -1;
      return computerPaddle.y + wrongDirection * PADDLE_HEIGHT * 2;
    }

    // Don't predict if ball is moving away
    if (ball.dx <= 0) {
      return computerPaddle.lastPredictedY;
    }

    let futureY = ball.y;
    let futureX = ball.x;
    let futureDY = ball.dy;
    
    // Predict with increasing uncertainty
    while (futureX < CANVAS_WIDTH - PADDLE_WIDTH) {
      futureX += ball.dx;
      futureY += futureDY;
      
      if (futureY <= 0 || futureY >= CANVAS_HEIGHT) {
        futureDY *= -1;
        // Add increasing uncertainty with each bounce
        futureY += (Math.random() - 0.5) * 40;
      }
    }

    // Apply current confidence level to prediction
    const baseError = (Math.random() - 0.5) * PREDICTION_ERROR * (2 - computerPaddle.confidenceLevel);
    const speedError = (ball.speed / INITIAL_BALL_SPEED - 1) * 30;
    
    return futureY + baseError + speedError;
  };

  const updateComputerPaddle = (deltaTime: number) => {
    const { computerPaddle, ball } = gameStateRef.current;
    const now = performance.now();

    // Update mistake state
    if (now - computerPaddle.mistakeTimer > 2000) { // Check every 2 seconds
      computerPaddle.mistakeTimer = now;
      computerPaddle.isMakingMistake = Math.random() < MISTAKE_PROBABILITY;
      
      // Vary confidence level over time
      computerPaddle.confidenceLevel = Math.max(0.5, Math.min(1.0, 
        computerPaddle.confidenceLevel + (Math.random() - 0.5) * 0.2
      ));
    }

    // Only update prediction periodically
    if (now - computerPaddle.lastUpdateTime > DECISION_DELAY) {
      computerPaddle.lastUpdateTime = now;
      
      if (ball.dx > 0) { // Ball moving towards computer
        const predictedY = predictBallY();
        computerPaddle.lastPredictedY = predictedY;

        // Add more randomness when making mistakes
        const randomOffset = (Math.random() - 0.5) * 
          (computerPaddle.isMakingMistake ? 100 : 30);
        
        computerPaddle.targetY = Math.min(
          Math.max(predictedY - PADDLE_HEIGHT / 2 + randomOffset, 0),
          CANVAS_HEIGHT - PADDLE_HEIGHT
        );
      } else {
        // Return to center with randomness
        computerPaddle.targetY = (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2 +
          (Math.random() - 0.5) * PADDLE_HEIGHT * 0.5;
      }
    }

    // Calculate movement with increased smoothing
    const diff = computerPaddle.targetY - computerPaddle.y;
    const desiredSpeed = Math.sign(diff) * 
      Math.min(Math.abs(diff) * 0.1, COMPUTER_MAX_SPEED);
    
    // Very smooth acceleration
    if (Math.abs(diff) > 10) {
      computerPaddle.speed = lerp(
        computerPaddle.speed,
        desiredSpeed,
        COMPUTER_ACCELERATION * deltaTime * computerPaddle.confidenceLevel
      );
    } else {
      computerPaddle.speed = lerp(computerPaddle.speed, 0, 0.1);
    }

    // Update position with extra smoothing
    computerPaddle.y = lerp(
      computerPaddle.y,
      computerPaddle.y + computerPaddle.speed * deltaTime,
      0.6
    );

    // Ensure paddle stays within bounds
    computerPaddle.y = Math.max(0, Math.min(
      CANVAS_HEIGHT - PADDLE_HEIGHT,
      computerPaddle.y
    ));
  };

  const resetBall = () => {
    const angle = (Math.random() * Math.PI / 4) + Math.PI / 8;
    const direction = Math.random() > 0.5 ? 1 : -1;

    gameStateRef.current.ball = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      dx: Math.cos(angle) * INITIAL_BALL_SPEED * direction,
      dy: Math.sin(angle) * INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      speed: INITIAL_BALL_SPEED,
    };
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      gameStateRef.current.keys[e.key] = true;
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      gameStateRef.current.keys[e.key] = false;
    }
  }, []);

  const handleGameOver = async () => {
    if (isGameOver) return;
    
    setIsGameOver(true);
    setIsSavingScore(true);
    
    try {
      // Only submit score if it's greater than 0
      if (scoreRef.current > 0) {
        await onGameOver(scoreRef.current);
      }
    } catch (error) {
      console.error('Error in game over handling:', error);
    } finally {
      setIsSavingScore(false);
    }
  };

  const updateGame = () => {
    const now = performance.now();
    const deltaTime = Math.min((now - gameStateRef.current.lastUpdate) / 16.667, 2);
    gameStateRef.current.lastUpdate = now;

    const { playerPaddle, ball, keys } = gameStateRef.current;

    // Update player paddle
    const targetSpeed = (keys.ArrowUp ? -PADDLE_SPEED : keys.ArrowDown ? PADDLE_SPEED : 0);
    playerPaddle.speed = lerp(playerPaddle.speed, targetSpeed, 0.2);
    playerPaddle.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, 
      playerPaddle.y + playerPaddle.speed * deltaTime));

    // Update computer paddle with human-like behavior
    updateComputerPaddle(deltaTime);

    // Smooth ball movement
    const nextX = ball.x + ball.dx * deltaTime;
    const nextY = ball.y + ball.dy * deltaTime;

    // Ball collision with top and bottom walls
    if (nextY <= 0 || nextY >= CANVAS_HEIGHT - BALL_SIZE) {
      ball.dy *= -1;
      ball.y = nextY <= 0 ? 0 : CANVAS_HEIGHT - BALL_SIZE;
    } else {
      ball.y = nextY;
    }

    // Ball collision with paddles
    if (
      nextX <= PADDLE_WIDTH &&
      ball.y >= playerPaddle.y &&
      ball.y <= playerPaddle.y + PADDLE_HEIGHT &&
      ball.dx < 0
    ) {
      const hitPos = (ball.y - playerPaddle.y) / PADDLE_HEIGHT;
      const angle = (hitPos - 0.5) * Math.PI / 3;
      
      ball.speed = Math.min(ball.speed * 1.05, MAX_BALL_SPEED);
      ball.dx = Math.abs(Math.cos(angle) * ball.speed);
      ball.dy = Math.sin(angle) * ball.speed;
      
      ball.x = PADDLE_WIDTH;
    } else if (
      nextX >= CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE &&
      ball.y >= gameStateRef.current.computerPaddle.y &&
      ball.y <= gameStateRef.current.computerPaddle.y + PADDLE_HEIGHT &&
      ball.dx > 0
    ) {
      const hitPos = (ball.y - gameStateRef.current.computerPaddle.y) / PADDLE_HEIGHT;
      const angle = Math.PI - (hitPos - 0.5) * Math.PI / 3;
      
      ball.speed = Math.min(ball.speed * 1.05, MAX_BALL_SPEED);
      ball.dx = Math.cos(angle) * ball.speed;
      ball.dy = Math.sin(angle) * ball.speed;
      
      ball.x = CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE;
    } else {
      ball.x = nextX;
    }

    // Check for scoring
    if (ball.x <= 0) {
      // Computer scored - game over immediately
      handleGameOver();
      return;
    } else if (ball.x >= CANVAS_WIDTH) {
      // Player scored - increase score and continue
      scoreRef.current += 1;
      onScoreUpdate(scoreRef.current);
      resetBall();
    }
  };

  // Helper function for smooth interpolation
  const lerp = (start: number, end: number, t: number) => {
    return start + (end - start) * t;
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Enable image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Clear canvas with alpha for smooth motion blur effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw center line
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.strokeStyle = '#6c5ce7';
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles with anti-aliasing
    ctx.fillStyle = '#6c5ce7';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#6c5ce7';
    
    ctx.fillRect(0, Math.round(gameStateRef.current.playerPaddle.y), PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillRect(
      CANVAS_WIDTH - PADDLE_WIDTH,
      Math.round(gameStateRef.current.computerPaddle.y),
      PADDLE_WIDTH,
      PADDLE_HEIGHT
    );

    // Draw ball with anti-aliasing
    ctx.beginPath();
    ctx.arc(
      Math.round(gameStateRef.current.ball.x),
      Math.round(gameStateRef.current.ball.y),
      BALL_SIZE,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  useEffect(() => {
    // Game loop
    const gameLoop = (time: number = 0) => {
      if (gameStarted && !isGameOver) {
        updateGame();
        draw();
        requestRef.current = requestAnimationFrame(gameLoop);
      }
    };

    if (gameStarted && !isGameOver) {
      gameLoop();
    }

    // Cleanup function
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
    };
  }, [gameStarted, isGameOver]);

  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      draw();
    }

    // Check initial wallet connection
    const checkWalletConnection = async () => {
      if (window.arweaveWallet) {
        try {
          const address = await window.arweaveWallet.getActiveAddress();
          setWalletConnected(!!address);
          if (address) {
            handleStartGame();
          }
        } catch (error) {
          console.error('Error checking wallet:', error);
          setWalletConnected(false);
        }
      }
    };

    checkWalletConnection();

    // Set up wallet connection listener
    const handleWalletConnection = () => {
      checkWalletConnection();
    };

    window.addEventListener('walletconnect', handleWalletConnection);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('walletconnect', handleWalletConnection);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleStartGame = async () => {
    if (!window.arweaveWallet) {
      console.log('Wallet not available');
      return;
    }

    try {
      const address = await window.arweaveWallet.getActiveAddress();
      if (!address) {
        console.log('No wallet address available');
        return;
      }

      setWalletConnected(true);
      setGameStarted(true);
      setIsGameOver(false);
      scoreRef.current = 0;
      onScoreUpdate(0);
      resetBall();
    } catch (error) {
      console.error('Error starting game:', error);
      setWalletConnected(false);
    }
  };

  const handleRestart = () => {
    setGameStarted(true);
    setIsGameOver(false);
    scoreRef.current = 0;
    onScoreUpdate(0);
    resetBall();
    onRestart();
  };

  return (
    <GameContainer>
      <Leaderboard gameId={GAME_ID} />
      <HUD score={scoreRef.current} />
      <Canvas ref={canvasRef} />
      {isGameOver && (
        <GameOver 
          score={scoreRef.current}
          onRestart={handleRestart}
          isSavingScore={isSavingScore}
        />
      )}
      {!gameStarted && (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#6c5ce7',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '20px',
          borderRadius: '10px',
          border: '2px solid #6c5ce7'
        }}>
          <div style={{ marginBottom: '10px' }}>
            {!walletConnected ? 'Connect wallet to play' : 'Ready to play!'}
          </div>
          <button 
            onClick={handleStartGame}
            style={{
              background: '#6c5ce7',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: walletConnected ? 'pointer' : 'not-allowed',
              opacity: walletConnected ? 1 : 0.5
            }}
            disabled={!walletConnected}
          >
            Start Game
          </button>
        </div>
      )}
    </GameContainer>
  );
};

export default Game;

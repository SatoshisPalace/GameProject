import React, { useEffect, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import GameOver from '../../../../shared-components/Game-over/GameOver';

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
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  
  const gameStateRef = useRef({
    board: Array(22).fill(null).map(() => Array(14).fill(0)),
    currentPiece: {
      shape: [[1, 1, 1, 1]],
      x: 0,
      y: 0,
    },
    dropCounter: 0,
    dropInterval: 1000,
  });

  const BLOCK_SIZE = 25;
  const BOARD_WIDTH = 14;
  const BOARD_HEIGHT = 22;
  const COLORS = [
    '#000000', // empty
    '#FF0D72', // I
    '#0DC2FF', // J
    '#0DFF72', // L
    '#F538FF', // O
    '#FF8E0D', // S
    '#FFE138', // T
    '#3877FF', // Z
  ];

  const SHAPES = [
    [[1, 1, 1, 1]], // I
    [[2, 0, 0], [2, 2, 2]], // J
    [[0, 0, 3], [3, 3, 3]], // L
    [[4, 4], [4, 4]], // O
    [[0, 5, 5], [5, 5, 0]], // S
    [[0, 6, 0], [6, 6, 6]], // T
    [[7, 7, 0], [0, 7, 7]], // Z
  ];

  const createPiece = () => {
    const piece = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    return {
      shape: piece,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(piece[0].length / 2),
      y: 0,
    };
  };

  const collide = (board: number[][], piece: any) => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x] !== 0) {
          const boardX = piece.x + x;
          const boardY = piece.y + y;
          
          if (
            boardX < 0 || 
            boardX >= BOARD_WIDTH ||
            boardY >= BOARD_HEIGHT ||
            (boardY >= 0 && board[boardY][boardX] !== 0)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const merge = (board: number[][], piece: any) => {
    piece.shape.forEach((row: number[], y: number) => {
      row.forEach((value: number, x: number) => {
        if (value !== 0) {
          board[y + piece.y][x + piece.x] = value;
        }
      });
    });
  };

  const updateScore = useCallback((newScore: number) => {
    if (isGameOver) return;
    scoreRef.current = newScore;
    onScoreUpdate(newScore);
    console.log('Score updated:', newScore);
  }, [onScoreUpdate, isGameOver]);

  const clearLines = () => {
    let linesCleared = 0;
    outer: for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (gameStateRef.current.board[y][x] === 0) {
          continue outer;
        }
      }
      
      const row = gameStateRef.current.board.splice(y, 1)[0].fill(0);
      gameStateRef.current.board.unshift(row);
      linesCleared++;
      y++;
    }
    
    if (linesCleared > 0) {
      const newScore = scoreRef.current + linesCleared * 100;
      updateScore(newScore);
    }
  };

  const drop = () => {
    if (isGameOver) return;
    const state = gameStateRef.current;
    state.currentPiece.y++;
    
    if (collide(state.board, state.currentPiece)) {
      state.currentPiece.y--;
      merge(state.board, state.currentPiece);
      clearLines();
      state.currentPiece = createPiece();
      
      const newScore = scoreRef.current + 1;
      updateScore(newScore);
      
      if (collide(state.board, state.currentPiece)) {
        handleGameOver();
      }
    }
    
    state.dropCounter = 0;
  };

  const move = (dir: number) => {
    const state = gameStateRef.current;
    state.currentPiece.x += dir;
    if (collide(state.board, state.currentPiece)) {
      state.currentPiece.x -= dir;
    }
  };

  const rotate = () => {
    const state = gameStateRef.current;
    const piece = state.currentPiece;
    const original = piece.shape;
    
    // Transpose and reverse for rotation
    piece.shape = piece.shape[0].map((_, i) =>
      piece.shape.map(row => row[i]).reverse()
    );
    
    if (collide(state.board, piece)) {
      piece.shape = original;
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw board
    gameStateRef.current.board.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          ctx.fillStyle = COLORS[value];
          ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
          ctx.strokeStyle = '#fff';
          ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
      });
    });
    
    // Draw current piece
    const { shape, x, y } = gameStateRef.current.currentPiece;
    shape.forEach((row: number[], pieceY: number) => {
      row.forEach((value: number, pieceX: number) => {
        if (value !== 0) {
          ctx.fillStyle = COLORS[value];
          ctx.fillRect(
            (x + pieceX) * BLOCK_SIZE,
            (y + pieceY) * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
          );
          ctx.strokeStyle = '#fff';
          ctx.strokeRect(
            (x + pieceX) * BLOCK_SIZE,
            (y + pieceY) * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
          );
        }
      });
    });
  };

  const update = (time: number = 0) => {
    if (isGameOver) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      return;
    }
    
    const deltaTime = time - (lastTimeRef.current || 0);
    lastTimeRef.current = time;
    
    gameStateRef.current.dropCounter += deltaTime;
    if (gameStateRef.current.dropCounter > gameStateRef.current.dropInterval) {
      drop();
    }
    
    draw();
    requestRef.current = requestAnimationFrame(update);
  };

  const resetGame = useCallback(() => {
    if (!canvasRef.current) return;

    gameStateRef.current = {
      board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
      currentPiece: {
        shape: [[1, 1, 1, 1]],
        x: Math.floor(BOARD_WIDTH / 2) - 2,
        y: 0,
      },
      dropCounter: 0,
      dropInterval: 1000,
    };

    setIsGameOver(false);
    setGameStarted(false);
    scoreRef.current = 0;
    onScoreUpdate(0);
    draw();
  }, [onScoreUpdate]);

  const handleGameOver = useCallback(async () => {
    setIsGameOver(true);
    setIsSavingScore(true);
    try {
      await onGameOver(scoreRef.current);
    } finally {
      setIsSavingScore(false);
    }
  }, [onGameOver]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (isGameOver) return;
    
    switch (event.key) {
      case 'ArrowLeft':
        move(-1);
        break;
      case 'ArrowRight':
        move(1);
        break;
      case 'ArrowDown':
        drop();
        break;
      case 'ArrowUp':
        rotate();
        break;
    }
  };

  const handleRestart = () => {
    resetGame();
    setGameStarted(true);
    onScoreUpdate(0);
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    
    canvasRef.current.width = BLOCK_SIZE * BOARD_WIDTH;
    canvasRef.current.height = BLOCK_SIZE * BOARD_HEIGHT;
    
    resetGame();
    window.addEventListener('keydown', handleKeyDown);
    requestRef.current = requestAnimationFrame(update);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (gameStarted) {
      onScoreUpdate(scoreRef.current);
    }
  }, [gameStarted, onScoreUpdate]);

  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <GameContainer>
      <Canvas ref={canvasRef} />
      {isGameOver && (
        <GameOver 
          score={scoreRef.current} 
          onRestart={() => {
            setIsGameOver(false);
            setGameStarted(false);
            scoreRef.current = 0;
            onScoreUpdate(0);
            onRestart();
          }} 
          isSavingScore={isSavingScore}
        />
      )}
    </GameContainer>
  );
};

export default Game;

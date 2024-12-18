import React, { useEffect, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import GameOver from '../../../../shared-components/Game-over/GameOver';
import WalletConnection from '../../../../shared-components/Wallet/WalletConnection';

const CELL_SIZE = 20;
const BOARD_WIDTH = 28;
const BOARD_HEIGHT = 25;
const PACMAN_SPEED = 3;  // Slightly increased speed
const GHOST_SPEED = 1.5;
const WALL_COLOR = '#FFD700';  // Yellow color for walls
const PLAYER_COLOR = '#FFFFFF';  // White color for player
const PLAYER_SIZE = 14;  // Slightly increased size

const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 200px auto 20px;
  width: fit-content;
  position: relative;
`;

const Canvas = styled.canvas`
  border: 2px solid ${WALL_COLOR};
  background-color: black;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  width: ${CELL_SIZE * BOARD_WIDTH}px;
  height: ${CELL_SIZE * BOARD_HEIGHT}px;
  display: block;
  margin: 0;
  padding: 0;
`;

interface GameProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => Promise<void>;
  onRestart: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface Ghost {
  position: Position;
  direction: Position;
  color: string;
}

const Game: React.FC<GameProps> = ({ onScoreUpdate, onGameOver, onRestart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const scoreRef = useRef(0);
  const [gameStarted, setGameStarted] = useState(false);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const isSubmittingRef = useRef(false);

  const gameStateRef = useRef({
    pacman: {
      position: { x: CELL_SIZE * 14, y: CELL_SIZE * 15 },  // Adjusted to be in a clear path
      direction: { x: 0, y: 0 },
      nextDirection: { x: 0, y: 0 },
    },
    ghosts: [
      { position: { x: CELL_SIZE * 13, y: CELL_SIZE * 11 }, direction: { x: 1, y: 0 }, color: '#FF0000' },
      { position: { x: CELL_SIZE * 14, y: CELL_SIZE * 11 }, direction: { x: -1, y: 0 }, color: '#00FFFF' },
      { position: { x: CELL_SIZE * 13, y: CELL_SIZE * 10 }, direction: { x: 0, y: 1 }, color: '#FFB8FF' },
      { position: { x: CELL_SIZE * 14, y: CELL_SIZE * 10 }, direction: { x: 0, y: -1 }, color: '#FFB852' },
    ] as Ghost[],
    dots: new Set<string>(),
    powerPellets: new Set<string>(),
    maze: [] as number[][],
  });

  const handleGameOver = useCallback(async () => {
    if (isGameOver) return;
    
    // Stop the game loop immediately
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = undefined;
    }

    // Set game over state
    setIsGameOver(true);
    const finalScore = scoreRef.current;

    setIsSavingScore(true);
    try {
      await onGameOver(finalScore);
    } catch (error) {
      console.error('Failed to save score:', error);
    } finally {
      setIsSavingScore(false);
    }
  }, [isGameOver, onGameOver]);

  const initializeGame = useCallback(() => {
    console.log('Initializing game...');
    const { maze } = gameStateRef.current;
    
    // Define the maze layout (0: empty, 1: wall, 2: dot)
    const mazeLayout = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,1,1,2,1,1,2,1,1,1,1,2,1,1,2,1,1,1,1,2,1,1,2,1,1,2,1],
      [1,2,1,2,2,2,1,2,2,2,2,2,2,1,1,2,2,2,2,2,2,1,2,2,2,1,2,1],
      [1,2,1,2,1,2,1,2,1,1,1,1,2,1,1,2,1,1,1,1,2,1,2,1,2,1,2,1],
      [1,2,2,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,2,2,2,1],
      [1,2,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,1,1,2,1,1,1,2,1,1,1,1,2,1,1,2,1,1,1,1,2,1,1,1,2,1,1,1],
      [1,2,2,2,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0,1,2,2,2,2,2,2,2,1],
      [1,2,1,1,1,1,1,2,1,0,0,0,0,0,0,0,0,0,0,1,2,1,1,1,1,1,2,1],
      [1,2,2,2,2,2,1,2,1,0,0,0,0,0,0,0,0,0,0,1,2,1,2,2,2,2,2,1],
      [1,1,1,1,1,2,1,2,1,1,1,0,0,0,0,0,1,1,1,1,2,1,2,1,1,1,1,1],
      [1,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,1],
      [1,2,1,1,1,2,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,2,1,1,1,2,1],
      [1,2,2,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,2,2,2,1],
      [1,1,1,2,1,2,1,2,1,1,1,1,2,1,1,2,1,1,1,1,2,1,2,1,2,1,1,1],
      [1,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,1],
      [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,1,1,1,2,1,1,1,1,2,1,2,1,1,2,1,2,1,1,1,1,2,1,1,1,2,1],
      [1,2,2,2,1,2,2,2,2,2,2,1,2,1,1,2,1,2,2,2,2,2,2,1,2,2,2,1],
      [1,2,1,2,1,1,1,1,1,1,2,1,2,1,1,2,1,2,1,1,1,1,1,1,2,1,2,1],
      [1,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,2,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    console.log('Copying maze layout...');
    // Copy maze layout and initialize dots
    gameStateRef.current.dots = new Set();
    for (let y = 0; y < mazeLayout.length; y++) {
      maze[y] = [...mazeLayout[y]];
      for (let x = 0; x < mazeLayout[y].length; x++) {
        if (mazeLayout[y][x] === 2) {
          gameStateRef.current.dots.add(`${x},${y}`);
        }
      }
    }

    console.log('Initializing dots and pellets...');
    // Initialize power pellets sets
    gameStateRef.current.powerPellets.clear();
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (maze[y][x] === 3) {
          gameStateRef.current.powerPellets.add(`${x},${y}`);
        }
      }
    }

    // Reset Pac-Man position
    gameStateRef.current.pacman = {
      position: { x: CELL_SIZE * 14, y: CELL_SIZE * 15 },  // Adjusted to be in a clear path
      direction: { x: 0, y: 0 },
      nextDirection: { x: 0, y: 0 },
    };

    // Reset ghost positions with random spawns
    gameStateRef.current.ghosts = [
      { position: getRandomValidPosition(), direction: { x: 1, y: 0 }, color: '#FF0000' },
      { position: getRandomValidPosition(), direction: { x: -1, y: 0 }, color: '#00FFFF' },
      { position: getRandomValidPosition(), direction: { x: 0, y: -1 }, color: '#FFB8FF' },
      { position: getRandomValidPosition(), direction: { x: 0, y: -1 }, color: '#FFB852' },
    ];

    console.log('Game initialization complete');
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const { maze, pacman, ghosts } = gameStateRef.current;
    
    // Draw maze and dots
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = maze[y][x];
        if (cell === 1) {
          // Draw wall
          ctx.fillStyle = WALL_COLOR;
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        } else if (cell === 2) {
          // Draw dot
          ctx.beginPath();
          ctx.arc(
            x * CELL_SIZE + CELL_SIZE / 2,
            y * CELL_SIZE + CELL_SIZE / 2,
            2,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.closePath();
        }
      }
    }

    // Draw player
    ctx.beginPath();
    ctx.arc(
      pacman.position.x + CELL_SIZE / 2,
      pacman.position.y + CELL_SIZE / 2,
      PLAYER_SIZE / 2,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = PLAYER_COLOR;
    ctx.fill();
    ctx.closePath();

    // Draw ghosts
    ghosts.forEach(ghost => {
      ctx.beginPath();
      ctx.arc(
        ghost.position.x + CELL_SIZE / 2,
        ghost.position.y + CELL_SIZE / 2,
        PLAYER_SIZE / 2,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = ghost.color;
      ctx.fill();
      ctx.closePath();
    });
  }, []);

  const isValidMove = (x: number, y: number): boolean => {
    // Convert pixel position to grid position
    const gridX = Math.floor(x / CELL_SIZE);
    const gridY = Math.floor(y / CELL_SIZE);
    
    // Check the current cell and adjacent cells
    const cellsToCheck = [
      [gridX, gridY],
      [Math.floor((x + PLAYER_SIZE) / CELL_SIZE), gridY],
      [gridX, Math.floor((y + PLAYER_SIZE) / CELL_SIZE)],
      [Math.floor((x + PLAYER_SIZE) / CELL_SIZE), Math.floor((y + PLAYER_SIZE) / CELL_SIZE)]
    ];
    
    for (const [checkX, checkY] of cellsToCheck) {
      if (
        checkX < 0 || 
        checkX >= BOARD_WIDTH || 
        checkY < 0 || 
        checkY >= BOARD_HEIGHT || 
        gameStateRef.current.maze[checkY][checkX] === 1
      ) {
        return false;
      }
    }
    
    return true;
  };

  const update = useCallback((deltaTime: number) => {
    if (isGameOver) return;
    
    const { pacman, ghosts, maze } = gameStateRef.current;

    // Try to move in the next direction if it's different from current direction
    if (pacman.nextDirection.x !== pacman.direction.x || pacman.nextDirection.y !== pacman.direction.y) {
      const nextX = pacman.position.x + pacman.nextDirection.x * PACMAN_SPEED;
      const nextY = pacman.position.y + pacman.nextDirection.y * PACMAN_SPEED;
      
      if (isValidMove(nextX, nextY)) {
        pacman.direction = { ...pacman.nextDirection };
      }
    }

    // Move in current direction
    const newX = pacman.position.x + pacman.direction.x * PACMAN_SPEED;
    const newY = pacman.position.y + pacman.direction.y * PACMAN_SPEED;

    if (isValidMove(newX, newY)) {
      pacman.position.x = newX;
      pacman.position.y = newY;

      // Keep player within bounds
      pacman.position.x = Math.max(0, Math.min(pacman.position.x, (BOARD_WIDTH - 1) * CELL_SIZE));
      pacman.position.y = Math.max(0, Math.min(pacman.position.y, (BOARD_HEIGHT - 1) * CELL_SIZE));

      // Check for dot collection
      const gridX = Math.floor((pacman.position.x + CELL_SIZE / 2) / CELL_SIZE);
      const gridY = Math.floor((pacman.position.y + CELL_SIZE / 2) / CELL_SIZE);
      const dotKey = `${gridX},${gridY}`;

      if (gameStateRef.current.dots.has(dotKey)) {
        gameStateRef.current.dots.delete(dotKey);
        maze[gridY][gridX] = 0; // Remove dot from maze
        scoreRef.current += 1; // Changed from 10 to 1 to balance with other games
        onScoreUpdate(scoreRef.current);
      }
    }

    // Check win condition outside of movement logic
    if (gameStateRef.current.dots.size === 0 && !isGameOver) {
      handleGameOver();
      return;
    }

    // Update ghost positions with improved AI
    let playerHit = false;
    
    ghosts.forEach(ghost => {
      if (playerHit || isGameOver) return;

      // Calculate current grid position
      const ghostGridX = Math.floor(ghost.position.x / CELL_SIZE);
      const ghostGridY = Math.floor(ghost.position.y / CELL_SIZE);

      // Check if ghost needs to change direction
      const needsNewDirection = 
        !isValidMove(
          ghost.position.x + ghost.direction.x * GHOST_SPEED,
          ghost.position.y + ghost.direction.y * GHOST_SPEED
        ) || Math.random() < 0.05;

      if (needsNewDirection) {
        // Get all possible directions
        const possibleDirections = [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 }
        ].filter(dir => {
          const nextX = ghost.position.x + dir.x * GHOST_SPEED;
          const nextY = ghost.position.y + dir.y * GHOST_SPEED;
          return isValidMove(nextX, nextY);
        });

        if (possibleDirections.length > 0) {
          // Calculate distances and weights for each direction
          const pacmanGridX = Math.floor(pacman.position.x / CELL_SIZE);
          const pacmanGridY = Math.floor(pacman.position.y / CELL_SIZE);
          
          const directionScores = possibleDirections.map(dir => {
            const nextX = ghostGridX + dir.x;
            const nextY = ghostGridY + dir.y;
            
            // Manhattan distance to player
            const distToPlayer = Math.abs(nextX - pacmanGridX) + Math.abs(nextY - pacmanGridY);
            
            // Penalty for reversing direction (to prevent back-and-forth movement)
            const reversePenalty = (dir.x === -ghost.direction.x && dir.y === -ghost.direction.y) ? 5 : 0;
            
            // Bonus for maintaining current direction (to encourage exploration)
            const momentumBonus = (dir.x === ghost.direction.x && dir.y === ghost.direction.y) ? 2 : 0;
            
            return {
              direction: dir,
              score: -(distToPlayer + reversePenalty - momentumBonus) // Negative because lower distance is better
            };
          });
          
          // Sort by score (higher is better)
          directionScores.sort((a, b) => b.score - a.score);
          
          // 85% chance to choose the best direction, 15% chance for random
          const newDir = Math.random() < 0.85
            ? directionScores[0].direction
            : directionScores[Math.floor(Math.random() * directionScores.length)].direction;
          
          ghost.direction = newDir;
        }
      }

      // Move ghost
      const newX = ghost.position.x + ghost.direction.x * GHOST_SPEED;
      const newY = ghost.position.y + ghost.direction.y * GHOST_SPEED;

      if (isValidMove(newX, newY)) {
        ghost.position.x = newX;
        ghost.position.y = newY;
      }

      // Check collision with player
      const distance = Math.hypot(
        ghost.position.x - pacman.position.x,
        ghost.position.y - pacman.position.y
      );

      if (distance < CELL_SIZE - 2) {
        playerHit = true;
      }
    });

    // Handle player hit outside of ghost loop
    if (playerHit && !isGameOver) {
      handleGameOver();
    }
  }, [handleGameOver, onScoreUpdate, isGameOver]);

  const gameLoop = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    if (!isGameOver) {
      update(deltaTime);
      draw();
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [ isGameOver]);

  const resetGame = useCallback(() => {
    // Cancel current game loop
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }

    // Reset all game state
    gameStateRef.current = {
      pacman: {
        position: { x: CELL_SIZE * 14, y: CELL_SIZE * 15 },
        direction: { x: 0, y: 0 },
        nextDirection: { x: 0, y: 0 },
      },
      ghosts: [
        { position: { x: CELL_SIZE * 13, y: CELL_SIZE * 11 }, direction: { x: 1, y: 0 }, color: '#FF0000' },
        { position: { x: CELL_SIZE * 14, y: CELL_SIZE * 11 }, direction: { x: -1, y: 0 }, color: '#00FFFF' },
        { position: { x: CELL_SIZE * 13, y: CELL_SIZE * 10 }, direction: { x: 0, y: 1 }, color: '#FFB8FF' },
        { position: { x: CELL_SIZE * 14, y: CELL_SIZE * 10 }, direction: { x: 0, y: -1 }, color: '#FFB852' },
      ],
      dots: new Set<string>(),
      powerPellets: new Set<string>(),
      maze: [],
    };
    
    // Reset score
    scoreRef.current = 0;
    
    // Reset game flags
    setIsGameOver(false);
    isSubmittingRef.current = false;
    lastTimeRef.current = undefined;

    // Initialize new game state
    initializeGame();
  }, [initializeGame]);

  const handleRestart = useCallback(() => {
    // Refresh the page
    window.location.reload();
  }, []);

  const getRandomValidPosition = useCallback((): Position => {
    const { maze } = gameStateRef.current;
    let x, y;
    do {
      x = Math.floor(Math.random() * BOARD_WIDTH);
      y = Math.floor(Math.random() * BOARD_HEIGHT);
    } while (
      maze[y][x] === 1 || // Not a wall
      (Math.abs(x - 14) < 3 && Math.abs(y - 15) < 3) // Not too close to player spawn
    );
    return {
      x: x * CELL_SIZE,
      y: y * CELL_SIZE
    };
  }, []);

  useEffect(() => {
    console.log('Setting up canvas...');
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas not found');
      return;
    }

    // Set canvas dimensions explicitly
    canvas.width = CELL_SIZE * BOARD_WIDTH;
    canvas.height = CELL_SIZE * BOARD_HEIGHT;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    console.log('Canvas dimensions:', canvas.width, canvas.height);
    initializeGame();
    setGameStarted(true);

    // Start game loop
    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      isSubmittingRef.current = false;
    };
  }, [initializeGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;  // Don't handle keys if game is over
      
      const { pacman } = gameStateRef.current;
      
      switch (e.key) {
        case 'ArrowLeft':
          pacman.nextDirection = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
          pacman.nextDirection = { x: 1, y: 0 };
          break;
        case 'ArrowUp':
          pacman.nextDirection = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
          pacman.nextDirection = { x: 0, y: 1 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameOver]);  // Add isGameOver dependency

  return (
    <GameContainer>
      <Canvas ref={canvasRef} />
      {isGameOver && (
        <GameOver
          score={scoreRef.current}
          onRestart={onRestart}
          isSavingScore={isSavingScore}
        />
      )}
    </GameContainer>
  );
};

export default Game;

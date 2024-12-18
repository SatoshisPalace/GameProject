import React, { useEffect, useRef, useState, useCallback } from 'react';
import '../styles/Game.css';
import GameOver from '../../../../shared-components/Game-over/GameOver.tsx';
import { useWallet } from '../../../../shared-components/Wallet/WalletContext.tsx';
import WalletConnection from '../../../../shared-components/Wallet/WalletConnection.tsx';
import { useScore } from '../../../../shared-components/Score/ScoreContext.tsx';
import crownImage from '../assets/crowned.png';

// Load crown image
const crown = new Image();
crown.src = crownImage;
crown.onload = () => {
  console.log('Crown image loaded successfully', {
    width: crown.width,
    height: crown.height,
    src: crown.src
  });
};
crown.onerror = (error) => {
  console.error('Error loading crown image:', error);
};

const Game = ({ onGameOver }) => {
    const canvasRef = useRef(null);
    const [gameOver, setGameOver] = useState(false);
    const [isSavingScore, setIsSavingScore] = useState(false);
    const [txId, setTxId] = useState(null);
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState('');
    const [blockchainScore, setBlockchainScore] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const animationFrameRef = useRef(null);
    const gameInitializedRef = useRef(false);
    const { isConnected: isWalletConnectedProp } = useWallet();
    const { currentScore, updateScore } = useScore();
    const { bazarProfile } = useWallet();
    const initialSize = 20;
    const crownThreshold = initialSize * 1.5;
    
    // Initialize game state reference
    const gameStateRef = useRef({
        ctx: null,
        gameActive: false,
        isGameOver: false,
        scoreSubmitted: false,
        player: {
            x: 0,
            y: 0,
            radius: 20,
            color: '#FFFFFF',
            speed: 2,
            speedBoost: false,
            speedBoostEndTime: 0  // Add these two lines
        },
        foods: [],
        bots: [],
        viewport: {
            x: 0,
            y: 0,
            width: window.innerWidth,
            height: window.innerHeight
        },
        mouse: {
            x: 0,
            y: 0
        },
        showCrown: false,
        currentScore: 0
    });

    useEffect(() => {
        setWalletConnected(isWalletConnectedProp);
    }, [isWalletConnectedProp]);

    // Constants for game mechanics
    const STARTING_RADIUS = 20;
    const MAX_RADIUS = 100;
    const FOOD_COUNT = 30;
    const FOOD_RADIUS = 3;
    const FOOD_GROWTH_RATE = 0.1;
    const BOT_GROWTH_RATE = 0.25;
    const MASS_DECAY_RATE = 0.9999;
    const MIN_DECAY_SIZE = 35;
    const MIN_EATABLE_SIZE = 15;
    const GRID_SIZE = 50;
    const BOT_COUNT = 20;
    const BOT_VIEW_RANGE = 300;
    const BOT_DECISION_RATE = 1000;
    const BOT_MOVEMENT_SMOOTHING = 0.08;
    const WORLD_WIDTH = 2000;
    const WORLD_HEIGHT = 2000;
    const MAX_SIZE = WORLD_WIDTH * 0.1; // Maximum size is 10% of world width
    const BASE_GROWTH_RATE = 0.5;
    const SCORE_PENALTY_THRESHOLD = 100; // Every 100 points
    const GROWTH_PENALTY_FACTOR = 0.7; // Reduce growth by 30% every threshold

    // Collision detection helper
    const checkCollision = (x1, y1, r1, x2, y2, r2) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < r1 + r2;
    };

    // Drawing functions
    function drawGrid() {
        const { ctx, viewport } = gameStateRef.current;
        if (!ctx) return;

        // Draw vertical lines with white color and 0.2 opacity
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x < viewport.width; x += GRID_SIZE) {
            const offsetX = x - (viewport.x % GRID_SIZE);
            ctx.beginPath();
            ctx.moveTo(offsetX, 0);
            ctx.lineTo(offsetX, viewport.height);
            ctx.stroke();
        }
        
        // Draw horizontal lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let y = 0; y < viewport.height; y += GRID_SIZE) {
            const offsetY = y - (viewport.y % GRID_SIZE);
            ctx.beginPath();
            ctx.moveTo(0, offsetY);
            ctx.lineTo(viewport.width, offsetY);
            ctx.stroke();
        }
    }

    function drawCircle(x, y, radius, color, isPlayer = false) {
        const { ctx } = gameStateRef.current;
        if (!ctx) return;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        
        if (isPlayer) {
            // Draw white border for player
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw blue outline for player
            ctx.strokeStyle = '#0066ff';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }

    // Function to keep entities within bounds
    function checkBoundaries(entity) {
        let hitWall = false;
        const margin = entity.radius || 0;
        
        // Use world dimensions instead of viewport
        if (entity.x < margin) {
            entity.x = margin;
            hitWall = true;
        }
        if (entity.x > WORLD_WIDTH - margin) {
            entity.x = WORLD_WIDTH - margin;
            hitWall = true;
        }
        if (entity.y < margin) {
            entity.y = margin;
            hitWall = true;
        }
        if (entity.y > WORLD_HEIGHT - margin) {
            entity.y = WORLD_HEIGHT - margin;
            hitWall = true;
        }
        
        return { hitWall };
    }

    // Generate food
    function generateFood() {
        gameStateRef.current.foods = [];
        for (let i = 0; i < FOOD_COUNT; i++) {
            gameStateRef.current.foods.push({
                x: Math.random() * WORLD_WIDTH,
                y: Math.random() * WORLD_HEIGHT,
                radius: FOOD_RADIUS,
                color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                score: Math.max(5, Math.random() * 10) // Random size between 5 and 10
            });
        }
    }

    // Bot AI functions
    function initializeBots() {
        gameStateRef.current.bots = [];
        
        // Initialize large bots first
        for (let i = 0; i < 8; i++) {
            const spawnQuadrant = Math.floor(Math.random() * 4);
            let x, y;
            
            // Spawn large bots in different quadrants
            switch(spawnQuadrant) {
                case 0: // top-left
                    x = Math.random() * (WORLD_WIDTH * 0.1);
                    y = Math.random() * (WORLD_HEIGHT * 0.1);
                    break;
                case 1: // top-right
                    x = WORLD_WIDTH * 0.6 + Math.random() * (WORLD_WIDTH * 0.1);
                    y = Math.random() * (WORLD_HEIGHT * 0.1);
                    break;
                case 2: // bottom-left
                    x = Math.random() * (WORLD_WIDTH * 0.1);
                    y = WORLD_HEIGHT * 0.6 + Math.random() * (WORLD_HEIGHT * 0.1);
                    break;
                case 3: // bottom-right
                    x = WORLD_WIDTH * 0.6 + Math.random() * (WORLD_WIDTH * 0.1);
                    y = WORLD_HEIGHT * 0.6 + Math.random() * (WORLD_HEIGHT * 0.1);
                    break;
            }

            gameStateRef.current.bots.push({
                x,
                y,
                radius: 35 + Math.random() * (45 - 35),
                color: `hsl(${Math.random() * 360}, 80%, 45%)`, 
                speed: 1.8, 
                targetX: x,
                targetY: y,
                lastDecision: 0,
                personality: 0.7 + Math.random() * 0.3, 
                currentVelX: 0,
                currentVelY: 0,
                isLargeBot: true
            });
        }

        // Initialize regular bots
        for (let i = 0; i < 12; i++) {
            const spawnQuadrant = Math.floor(Math.random() * 4);
            let x, y;
            
            // Spawn regular bots in different quadrants
            switch(spawnQuadrant) {
                case 0:
                    x = Math.random() * (WORLD_WIDTH * 0.1);
                    y = Math.random() * (WORLD_HEIGHT * 0.1);
                    break;
                case 1:
                    x = WORLD_WIDTH * 0.6 + Math.random() * (WORLD_WIDTH * 0.1);
                    y = Math.random() * (WORLD_HEIGHT * 0.1);
                    break;
                case 2:
                    x = Math.random() * (WORLD_WIDTH * 0.1);
                    y = WORLD_HEIGHT * 0.6 + Math.random() * (WORLD_HEIGHT * 0.1);
                    break;
                case 3:
                    x = WORLD_WIDTH * 0.6 + Math.random() * (WORLD_WIDTH * 0.1);
                    y = WORLD_HEIGHT * 0.6 + Math.random() * (WORLD_HEIGHT * 0.1);
                    break;
            }

            gameStateRef.current.bots.push({
                x,
                y,
                radius: STARTING_RADIUS * (0.8 + Math.random() * 0.1),
                color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                speed: 2,
                targetX: x,
                targetY: y,
                lastDecision: 0,
                personality: Math.random(),
                currentVelX: 0,
                currentVelY: 0,
                isLargeBot: false
            });
        }
    }

    function updateBotBehavior(bot) {
        const now = Date.now();
        if (now - bot.lastDecision < BOT_DECISION_RATE) return;
        bot.lastDecision = now;

        // Find nearby entities
        const nearbyFood = gameStateRef.current.foods.filter(food => {
            const dx = food.x - bot.x;
            const dy = food.y - bot.y;
            return Math.sqrt(dx * dx + dy * dy) < BOT_VIEW_RANGE;
        });

        // Find nearby threats (bigger bots and player)
        const threats = [...gameStateRef.current.bots, gameStateRef.current.player].filter(other => {
            if (other === bot) return false;
            const dx = other.x - bot.x;
            const dy = other.y - bot.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < BOT_VIEW_RANGE * 1.5 && other.radius > bot.radius * 1.2;
        });

        if (threats.length > 0) {
            // Run away from the closest threat
            const closestThreat = threats.reduce((closest, threat) => {
                const dx = threat.x - bot.x;
                const dy = threat.y - bot.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (!closest || distance < closest.distance) {
                    return { threat, distance };
                }
                return closest;
            }, null);

            if (closestThreat) {
                // Run in the opposite direction
                const dx = bot.x - closestThreat.threat.x;
                const dy = bot.y - closestThreat.threat.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Increase speed when fleeing
                bot.speed = 3;
                bot.targetX = bot.x + (dx / distance) * BOT_VIEW_RANGE;
                bot.targetY = bot.y + (dy / distance) * BOT_VIEW_RANGE;
                
                // Keep within world bounds
                bot.targetX = Math.max(bot.radius, Math.min(WORLD_WIDTH - bot.radius, bot.targetX));
                bot.targetY = Math.max(bot.radius, Math.min(WORLD_HEIGHT - bot.radius, bot.targetY));
                return;
            }
        }

        // If no threats, normal food seeking behavior
        bot.speed = 2;
        if (nearbyFood.length > 0) {
            // Find closest food
            const closest = nearbyFood.reduce((prev, curr) => {
                const prevDist = Math.sqrt(Math.pow(prev.x - bot.x, 2) + Math.pow(prev.y - bot.y, 2));
                const currDist = Math.sqrt(Math.pow(curr.x - bot.x, 2) + Math.pow(curr.y - bot.y, 2));
                return currDist < prevDist ? curr : prev;
            });

            bot.targetX = closest.x;
            bot.targetY = closest.y;
        } else {
            // Random movement if no food nearby
            bot.targetX = bot.x + (Math.random() - 0.5) * BOT_VIEW_RANGE;
            bot.targetY = bot.y + (Math.random() - 0.5) * BOT_VIEW_RANGE;
            
            // Keep within world bounds
            bot.targetX = Math.max(bot.radius, Math.min(WORLD_WIDTH - bot.radius, bot.targetX));
            bot.targetY = Math.max(bot.radius, Math.min(WORLD_HEIGHT - bot.radius, bot.targetY));
        }
    }

    function updateBots() {
        const botsToRemove = [];

        for (const bot of gameStateRef.current.bots) {
            // Update AI behavior
            updateBotBehavior(bot);

            // Calculate desired velocity
            const dx = bot.targetX - bot.x;
            const dy = bot.targetY - bot.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const speed = bot.speed * (1 - (bot.radius / MAX_RADIUS) * 0.5);
                
                // Calculate new position
                const targetVelX = (dx / distance) * speed;
                const targetVelY = (dy / distance) * speed;

                bot.currentVelX += (targetVelX - bot.currentVelX) * BOT_MOVEMENT_SMOOTHING;
                bot.currentVelY += (targetVelY - bot.currentVelY) * BOT_MOVEMENT_SMOOTHING;

                bot.x += bot.currentVelX;
                bot.y += bot.currentVelY;
            }

            // Check collisions with food
            const foodToRemove = [];
            for (let i = 0; i < gameStateRef.current.foods.length; i++) {
                const food = gameStateRef.current.foods[i];
                if (checkCollision(bot.x, bot.y, bot.radius, food.x, food.y, FOOD_RADIUS)) {
                    foodToRemove.push(i);
                    
                    // Calculate growth based on current size
                    const sizeRatio = bot.radius / MAX_RADIUS;
                    const growthFactor = Math.max(0.05, FOOD_GROWTH_RATE * (1 - sizeRatio));
                    const sizeIncrease = growthFactor;
                    
                    // Update score and size
                    bot.radius = Math.min(MAX_RADIUS, bot.radius + sizeIncrease);
                }
            }

            // Remove eaten food
            for (let i = foodToRemove.length - 1; i >= 0; i--) {
                gameStateRef.current.foods.splice(foodToRemove[i], 1);
            }

            // Check collisions with player - do this before drawing
            let skipRemainingCollisions = false;
            if (checkCollision(bot.x, bot.y, bot.radius, gameStateRef.current.player.x, gameStateRef.current.player.y, gameStateRef.current.player.radius)) {
                if (bot.radius > gameStateRef.current.player.radius) {
                    // Bot eats player - game over with current score
                    const finalScore = Math.floor(gameStateRef.current.currentScore);
                    handleScoreUpdate(finalScore);
                    handleGameOver();
                    return;
                } else {
                    // Player eats bot
// Player eats bot
botsToRemove.push(bot);
gameStateRef.current.player.radius += bot.radius * BOT_GROWTH_RATE;
gameStateRef.current.currentScore += 100 + (bot.radius * 10); // 100 base points plus size value
handleScoreUpdate(gameStateRef.current.currentScore);
                    skipRemainingCollisions = true;
                }
            }

            // Only skip remaining logic if the bot was eaten
            if (skipRemainingCollisions) {
                continue;
            }

            // Check collisions with other bots
            for (const otherBot of gameStateRef.current.bots) {
                if (bot === otherBot || botsToRemove.includes(bot) || botsToRemove.includes(otherBot)) continue;

                if (checkCollision(bot.x, bot.y, bot.radius, otherBot.x, otherBot.y, otherBot.radius)) {
                    if (bot.radius > otherBot.radius) {
                        // This bot eats the other bot
                        botsToRemove.push(otherBot);
                        bot.radius += otherBot.radius * BOT_GROWTH_RATE;
                    }
                }
            }

            // Keep in bounds
            const bounds = checkBoundaries(bot);
            if (bounds.hitWall) {
                bot.currentVelX *= 0.8;
                bot.currentVelY *= 0.8;
            }

            // Draw bot
            const screenX = bot.x - gameStateRef.current.viewport.x + gameStateRef.current.viewport.width / 2;
            const screenY = bot.y - gameStateRef.current.viewport.y + gameStateRef.current.viewport.height / 2;
            drawCircle(screenX, screenY, bot.radius, bot.color);
        }

        // Remove eaten bots and spawn new ones to maintain bot count
        if (botsToRemove.length > 0) {
            gameStateRef.current.bots = gameStateRef.current.bots.filter(bot => !botsToRemove.includes(bot));
            
            // Spawn new bots to replace eaten ones
            for (let i = 0; i < botsToRemove.length; i++) {
                const spawnQuadrant = Math.floor(Math.random() * 4);
                let x, y;
                
                switch(spawnQuadrant) {
                    case 0:
                        x = Math.random() * (WORLD_WIDTH * 0.4);
                        y = Math.random() * (WORLD_HEIGHT * 0.4);
                        break;
                    case 1:
                        x = WORLD_WIDTH * 0.6 + Math.random() * (WORLD_WIDTH * 0.4);
                        y = Math.random() * (WORLD_HEIGHT * 0.4);
                        break;
                    case 2:
                        x = Math.random() * (WORLD_WIDTH * 0.4);
                        y = WORLD_HEIGHT * 0.6 + Math.random() * (WORLD_HEIGHT * 0.4);
                        break;
                    case 3:
                        x = WORLD_WIDTH * 0.6 + Math.random() * (WORLD_WIDTH * 0.4);
                        y = WORLD_HEIGHT * 0.6 + Math.random() * (WORLD_HEIGHT * 0.4);
                        break;
                }

                gameStateRef.current.bots.push({
                    x,
                    y,
                    radius: STARTING_RADIUS * (0.8 + Math.random() * 0.4),
                    color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                    speed: 2,
                    targetX: x,
                    targetY: y,
                    lastDecision: 0,
                    personality: Math.random(),
                    currentVelX: 0,
                    currentVelY: 0,
                    isLargeBot: false
                });
            }
        }
    }

    function getDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Handle game over
    const handleGameOver = async () => {
        if (gameStateRef.current.isGameOver) return;
        
        gameStateRef.current.isGameOver = true;
        gameStateRef.current.gameActive = false;
        setGameOver(true);
        
        const finalScore = Math.floor(gameStateRef.current.currentScore);
        console.log('Game Over - Final Score:', finalScore);
        
        if (finalScore > 0) {
            setIsSavingScore(true);
            try {
                await onGameOver(finalScore);
            } catch (error) {
                console.error('Error submitting score:', error);
            } finally {
                setIsSavingScore(false);
            }
        }
        
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    };

    // Handle score updates
    const handleScoreUpdate = useCallback((newScore) => {
        const score = Math.floor(newScore);
        console.log('Updating score:', score);
        gameStateRef.current.currentScore = score;
        updateScore(score);
    }, [updateScore]);

    // Bot collision handler
    const handleBotCollision = (bot, index) => {
        const { player } = gameStateRef.current;
        
        if (player.radius > bot.radius) {
            // Player eats bot
            player.radius = Math.sqrt(player.radius * player.radius + bot.radius * bot.radius);
            gameStateRef.current.bots.splice(index, 1);
            const newScore = gameStateRef.current.currentScore + 10; // Changed from Math.floor(bot.radius) to just 10
            handleScoreUpdate(newScore);
        } else if (bot.radius > player.radius) {
            // Bot eats player - trigger game over
            handleGameOver();
        }
    };

    const handleRestart = () => {
        setGameOver(false);
        handleScoreUpdate(0);
        setTxId(null);
        cleanup(); // Ensure complete cleanup
        setTimeout(() => {
            initGame(); // Reinitialize game after a short delay
        }, 100);
    };

    // Clean up function to ensure proper cleanup
    const cleanup = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (gameStateRef.current) {
            gameStateRef.current.gameActive = false;
            gameStateRef.current.isGameOver = false;
            gameStateRef.current.scoreSubmitted = false;
            gameStateRef.current.currentScore = 0;
        }
        gameInitializedRef.current = false;
    }, []);

    // Game loop implementation
    const gameLoop = useCallback(() => {
        if (!gameStateRef.current.gameActive || !gameInitializedRef.current) {
            console.log('Game not active or not initialized');
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            return;
        }

        const { ctx, viewport, player, mouse } = gameStateRef.current;
        if (!ctx) {
            console.log('No context in game loop');
            return;
        }

        // Update player position based on mouse
        const updatePlayerPosition = () => {
            const { player, mouse, viewport } = gameStateRef.current;
            if (!mouse) return;

            const dx = mouse.x - viewport.width / 2;
            const dy = mouse.y - viewport.height / 2;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 5) {
                const speedMultiplier = Math.max(0.5, 2 - (player.radius / STARTING_RADIUS) * 0.5);
                const boostMultiplier = player.speedBoost ? 2 : 1;
                const newX = player.x + (dx / distance) * player.speed * speedMultiplier * boostMultiplier;
                const newY = player.y + (dy / distance) * player.speed * speedMultiplier * boostMultiplier;
                
                // Add this at the end of movement update
                if (player.speedBoost && Date.now() > player.speedBoostEndTime) {
                    player.speedBoost = false;
                }
                
                // Clamp position within world bounds
                player.x = Math.max(player.radius, Math.min(WORLD_WIDTH - player.radius, newX));
                player.y = Math.max(player.radius, Math.min(WORLD_HEIGHT - player.radius, newY));
                
                // Update viewport (camera) position smoothly
                viewport.x += (player.x - viewport.x) * 0.03;
                viewport.y += (player.y - viewport.y) * 0.03;
            }
        };

        updatePlayerPosition();

        // Clear canvas
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, viewport.width, viewport.height);

        // Draw grid
        drawGrid();

        // Check food collisions and draw food
        const foodToRemove = [];
        gameStateRef.current.foods.forEach((food, index) => {
            const screenX = food.x - viewport.x + viewport.width / 2;
            const screenY = food.y - viewport.y + viewport.height / 2;

            // Check collision with player
            if (checkCollision(player.x, player.y, player.radius, food.x, food.y, FOOD_RADIUS)) {
                foodToRemove.push(index);
                
                // Calculate growth based on current size
                const sizeRatio = player.radius / MAX_RADIUS;
                const growthFactor = Math.max(0.05, FOOD_GROWTH_RATE * (1 - sizeRatio));
                const sizeIncrease = growthFactor;
                
                // Update score and size
gameStateRef.current.currentScore += 10; // Change to 10 points per food
                player.radius = Math.min(MAX_RADIUS, player.radius + sizeIncrease);
                
                handleScoreUpdate(gameStateRef.current.currentScore);
            } else {
                // Draw food if not eaten
                if (food.score < MIN_EATABLE_SIZE) {
                    ctx.fillStyle = '#666666'; // Gray for non-eatable food
                } else {
                    ctx.fillStyle = '#ff0000'; // Red for eatable food
                }
                ctx.beginPath();
                ctx.arc(screenX, screenY, FOOD_RADIUS, 0, Math.PI * 2);
                ctx.fill();
                ctx.closePath();
            }
        });

        // Remove eaten food
        for (let i = foodToRemove.length - 1; i >= 0; i--) {
            gameStateRef.current.foods.splice(foodToRemove[i], 1);
        }

        // Respawn food
        while (gameStateRef.current.foods.length < FOOD_COUNT) {
            gameStateRef.current.foods.push({
                x: Math.random() * WORLD_WIDTH,
                y: Math.random() * WORLD_HEIGHT,
                radius: FOOD_RADIUS,
                color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                score: Math.max(5, Math.random() * 10) // Random size between 5 and 10
            });
        }

        // Update and draw bots
        if (gameStateRef.current.bots.length > 0) {
            updateBots();
        }

        // Draw player
        const screenX = player.x - viewport.x + viewport.width / 2;
        const screenY = player.y - viewport.y + viewport.height / 2;
        drawCircle(screenX, screenY, player.radius, player.color, true);

        animationFrameRef.current = requestAnimationFrame(gameLoop);
    }, [handleScoreUpdate]);

    const calculateGrowthRate = (score) => {
        // Calculate how many thresholds we've passed
        const thresholdsPassed = Math.floor(score / SCORE_PENALTY_THRESHOLD);
        
        // Calculate penalty based on thresholds passed
        // Each threshold reduces growth by GROWTH_PENALTY_FACTOR
        const penaltyMultiplier = Math.pow(GROWTH_PENALTY_FACTOR, thresholdsPassed);
        
        // Calculate size-based penalty (as before)
        const sizeRatio = gameStateRef.current.player.radius / MAX_SIZE;
        const sizeBasedGrowth = Math.max(0.1, BASE_GROWTH_RATE * (1 - sizeRatio));
        
        // Combine both penalties
        return sizeBasedGrowth * penaltyMultiplier;
    };

    // Initialize game
    const initGame = useCallback(() => {
        console.log('Initializing game...');
        if (!canvasRef.current) {
            console.log('No canvas reference');
            return;
        }

        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.log('No canvas context');
            return;
        }

        console.log('Canvas size:', canvas.width, canvas.height);

        // Reset score
        handleScoreUpdate(0);

        // Initialize game state
        gameStateRef.current = {
            ctx,
            gameActive: true,
            isGameOver: false,
            scoreSubmitted: false,
            player: {
                x: canvas.width / 2,
                y: canvas.height / 2,
                radius: STARTING_RADIUS,
                color: '#FFFFFF',
                speed: 2
            },
            foods: [],
            bots: [],
            viewport: {
                x: canvas.width / 2,
                y: canvas.height / 2,
                width: canvas.width,
                height: canvas.height
            },
            mouse: {
                x: canvas.width / 2,
                y: canvas.height / 2
            },
            showCrown: false,
            currentScore: 0
        };

        console.log('Game state initialized');
        
        // Initialize game elements
        generateFood();
        console.log('Food generated:', gameStateRef.current.foods.length);
        
        initializeBots();
        console.log('Bots initialized:', gameStateRef.current.bots.length);
        
        handleScoreUpdate(0);
        setGameOver(false);
        setTxId(null);
        
        gameInitializedRef.current = true;
        
        // Start game loop
        if (!animationFrameRef.current) {
            console.log('Starting game loop');
            gameLoop();
        }
    }, [gameLoop, handleScoreUpdate]);

    useEffect(() => {
        console.log('Main effect running');
        const canvas = canvasRef.current;
        if (!canvas) {
            console.log('No canvas in effect');
            return;
        }

        // Initialize game
        initGame();
        
        // Handle mouse movement
        const handleMouseMove = (e) => {
            if (!gameStateRef.current.gameActive) return;
            
            const rect = canvas.getBoundingClientRect();
            gameStateRef.current.mouse.x = e.clientX - rect.left;
            gameStateRef.current.mouse.y = e.clientY - rect.top;
        };

        const handleKeyDown = (e) => {
            if (e.code === 'Space' && gameStateRef.current.gameActive) {
                const player = gameStateRef.current.player;
                if (!player.speedBoost && player.radius > STARTING_RADIUS) {
                    player.radius -= 1;
                    player.speedBoost = true;
                    player.speedBoostEndTime = Date.now() + 2500;
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        // Handle window resize
        const handleResize = () => {
            if (!canvas) return;
            
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            if (gameStateRef.current) {
                gameStateRef.current.viewport.width = canvas.width;
                gameStateRef.current.viewport.height = canvas.height;
            }
        };

        // Add event listeners
        window.addEventListener('resize', handleResize);
        canvas.addEventListener('mousemove', handleMouseMove);

        // Cleanup
        return () => {
            console.log('Cleaning up main effect');
            window.removeEventListener('resize', handleResize);
            canvas.removeEventListener('mousemove', handleMouseMove);
            cleanup();
        };
    }, [initGame, cleanup]);

    // Mass decay system
    useEffect(() => {
        if (!gameStateRef.current.gameActive) return;

        const decayInterval = setInterval(() => {
            if (gameStateRef.current.player.radius > MIN_DECAY_SIZE) {
                gameStateRef.current.player.radius *= MASS_DECAY_RATE;
            }
        }, 1000);

        return () => clearInterval(decayInterval);
    }, [MIN_DECAY_SIZE, MASS_DECAY_RATE]);

    useEffect(() => {
        if (walletConnected && walletAddress) {
            // fetchOverallScore(walletAddress).then(score => setBlockchainScore(score));
            // fetchLeaderboardWithRetry();
        }
    }, [walletConnected, walletAddress]);

    const handleEndGame = () => {
        const finalScore = Math.floor(gameStateRef.current.currentScore);
        handleScoreUpdate(finalScore);
        handleGameOver();
    };

    return (
        <div>
            <button className="end-game-button" onClick={handleEndGame}>
            End Game
        </button>
            <canvas ref={canvasRef} />
            {gameOver && (
                <GameOver
                    score={currentScore}
                    onRestart={handleRestart}
                    isSavingScore={isSavingScore}
                    txId={txId}
                />
            )}
            {!walletConnected && !gameOver && (
                <WalletConnection />
            )}
        </div>
    );
};

export default Game;
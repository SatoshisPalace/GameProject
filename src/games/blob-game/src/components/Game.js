import React, { useEffect, useRef, useState, useCallback } from 'react';
import Arweave from 'arweave';
import '../styles/Game.css';

// Initialize Arweave
const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
    timeout: 20000,
    logging: false,
});

// Collision detection
const checkCollision = (x1, y1, r1, x2, y2, r2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < r1 + r2;
};

const Game = () => {
    const canvasRef = useRef(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState('');
    const [blockchainScore, setBlockchainScore] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [txId, setTxId] = useState(null);
    const [isTransactionPending, setIsTransactionPending] = useState(false);
    
    // Constants
    const STARTING_RADIUS = 20;
    const MAX_RADIUS = 100;
    const FOOD_COUNT = 200;
    const FOOD_RADIUS = 3;
    const CAMERA_LERP = 0.03;
    const MASS_DECAY_RATE = 0.9999;
    const MIN_DECAY_SIZE = 35;
    const GRID_SIZE = 50;
    const BOT_COUNT = 35;
    const BOT_VIEW_RANGE = 300;
    const BOT_DECISION_RATE = 1000;
    const BOT_MOVEMENT_SMOOTHING = 0.08;
    const BOT_RANDOM_MOVEMENT_CHANCE = 0.15;
    const LARGE_BOT_COUNT = 8;
    const LARGE_BOT_MIN_RADIUS = 35;
    const LARGE_BOT_MAX_RADIUS = 45;
    const EAT_SIZE_RATIO = 0.8;
    const FOOD_GROWTH_RATE = 0.4;
    const BOT_GROWTH_RATE = 0.25;

    // Game world dimensions (larger than viewport)
    const WORLD_WIDTH = window.innerWidth * 2;
    const WORLD_HEIGHT = window.innerHeight * 2;

    // Create player logo
    const playerLogo = new Image();
    playerLogo.src = 'https://i.ibb.co/ZmNpR7W/LOGO.png';

    // Game state refs to avoid re-renders
    const gameStateRef = useRef({
        player: {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            radius: STARTING_RADIUS,
            color: '#FFFFFF',
            speed: 2
        },
        viewport: {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            width: window.innerWidth,
            height: window.innerHeight
        },
        mouse: {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        },
        foods: [],
        bots: [],
        gameActive: true,
        ctx: null,
        lastLeaderboardUpdate: 0,
        grid: {},
        currentScore: 0
    });

    // Wallet functions
    const connectWallet = async () => {
        try {
            if (!window.arweaveWallet) {
                alert('Please install ArConnect to use this feature');
                return;
            }

            // First disconnect to ensure clean state
            try {
                await window.arweaveWallet.disconnect();
            } catch (error) {
                console.error('Error disconnecting wallet:', error);
            }

            // Request permissions
            const permissions = [
                'ACCESS_ADDRESS',
                'SIGN_TRANSACTION',
                'DISPATCH',
                'ACCESS_PUBLIC_KEY'
            ];
            
            await window.arweaveWallet.connect(permissions);
            
            // Verify permissions
            await window.arweaveWallet.getPermissions();
            
            // Get address
            const address = await window.arweaveWallet.getActiveAddress();
            
            setWalletAddress(address);
            setWalletConnected(true);
            
            // Save connection state
            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('walletAddress', address);
        } catch (error) {
            alert('Failed to connect wallet: ' + error.message);
            
            // Reset state on error
            setWalletConnected(false);
            setWalletAddress('');
            localStorage.removeItem('walletConnected');
            localStorage.removeItem('walletAddress');
        }
    };

    const disconnectWallet = async () => {
        try {
            if (window.arweaveWallet) {
                await window.arweaveWallet.disconnect();
                setWalletAddress('');
                setWalletConnected(false);
                // Clear connection state
                localStorage.removeItem('walletConnected');
                localStorage.removeItem('walletAddress');
            }
        } catch (error) {
            console.error('Error disconnecting wallet:', error);
        }
    };

    // Auto-connect wallet if previously connected
    useEffect(() => {
        const autoConnectWallet = async () => {
            const wasConnected = localStorage.getItem('walletConnected') === 'true';
            const savedAddress = localStorage.getItem('walletAddress');
            
            if (wasConnected && window.arweaveWallet) {
                try {
                    // Request permissions
                    const permissions = [
                        'ACCESS_ADDRESS',
                        'SIGN_TRANSACTION',
                        'DISPATCH',
                        'ACCESS_PUBLIC_KEY'
                    ];
                    
                    await window.arweaveWallet.connect(permissions);
                    
                    // Verify permissions
                    await window.arweaveWallet.getPermissions();
                    
                    const currentAddress = await window.arweaveWallet.getActiveAddress();
                    
                    // Verify if the current address matches the saved address
                    if (currentAddress === savedAddress) {
                        setWalletAddress(currentAddress);
                        setWalletConnected(true);
                    } else {
                        localStorage.removeItem('walletConnected');
                        localStorage.removeItem('walletAddress');
                    }
                } catch (error) {
                    console.error('Error auto-connecting wallet:', error);
                    localStorage.removeItem('walletConnected');
                    localStorage.removeItem('walletAddress');
                }
            }
        };

        // Wait for window.arweaveWallet to be available
        const checkWalletAndConnect = () => {
            if (window.arweaveWallet) {
                autoConnectWallet();
            } else {
                // Check again in 500ms if wallet is not yet available
                setTimeout(checkWalletAndConnect, 500);
            }
        };

        checkWalletAndConnect();
    }, []);

    // Fetch blockchain score
    const fetchOverallScore = async (address) => {
        try {
            const query = `
                query {
                    transactions(
                        owners: ["${address}"]
                        tags: [
                            { name: "App-Name", values: ["Arweave-Agario"] }
                            { name: "Type", values: ["game-score"] }
                        ]
                        first: 100
                    ) {
                        edges {
                            node {
                                id
                                tags {
                                    name
                                    value
                                }
                            }
                        }
                    }
                }
            `;

            const response = await fetch('https://arweave.net/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            const result = await response.json();
            
            const transactions = result.data.transactions.edges;
            let totalScore = 0;
            
            if (transactions.length > 0) {
                for (const tx of transactions) {
                    const scoreTag = tx.node.tags.find(tag => tag.name === 'Score');
                    if (scoreTag) {
                        totalScore += parseInt(scoreTag.value);
                    }
                }
                return totalScore;
            }
            return 0;
        } catch (error) {
            console.error('Error fetching overall score:', error);
            return 0;
        }
    };

    // Fetch leaderboard data with immediate retry
    const fetchLeaderboardWithRetry = async (maxAttempts = 10, initialDelayMs = 500) => {
        console.log('Starting leaderboard fetch with immediate retry');
        let attempt = 0;
        let delay = initialDelayMs;

        const tryFetch = async () => {
            try {
                const query = `
                    query {
                        transactions(
                            tags: [
                                { name: "App-Name", values: ["Arweave-Agario"] }
                                { name: "Type", values: ["game-score"] }
                            ]
                            first: 100
                            sort: HEIGHT_DESC
                        ) {
                            edges {
                                node {
                                    id
                                    owner {
                                        address
                                    }
                                    data {
                                        size
                                    }
                                }
                            }
                        }
                    }
                `;

                const response = await fetch('https://arweave.net/graphql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });

                const result = await response.json();
                const transactions = result.data.transactions.edges;
                
                // Fetch transaction data in parallel
                const txDataPromises = transactions.map(tx => 
                    fetch(`https://arweave.net/${tx.node.id}`)
                        .then(res => res.json())
                        .catch(error => {
                            console.error('Error fetching tx data:', tx.node.id, error);
                            return null;
                        })
                );

                const txsData = await Promise.all(txDataPromises);
                
                // Create a map of wallet addresses to their total scores
                const walletScores = new Map();
                
                transactions.forEach((tx, index) => {
                    const txData = txsData[index];
                    if (txData && typeof txData.score === 'number') {
                        const address = tx.node.owner.address;
                        console.log('Processing transaction:', {
                            txId: tx.node.id,
                            address,
                            score: txData.score
                        });
                        walletScores.set(
                            address,
                            (walletScores.get(address) || 0) + txData.score
                        );
                    }
                });

                // Convert to sorted array
                const leaderboardData = Array.from(walletScores.entries())
                    .map(([address, score]) => ({
                        address,
                        score
                    }))
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 10);

                console.log('New leaderboard data:', leaderboardData);
                setLeaderboard(leaderboardData);
                return true;
            } catch (error) {
                console.error(`Leaderboard fetch attempt ${attempt + 1} failed:`, error);
                return false;
            }
        };

        while (attempt < maxAttempts) {
            const success = await tryFetch();
            if (success) {
                console.log(`Leaderboard updated successfully on attempt ${attempt + 1}`);
                return;
            }
            
            console.log(`Waiting ${delay}ms before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay = Math.min(delay * 1.5, 3000); // Increase delay but cap it at 3 seconds
            attempt++;
        }
    };

    // Handle game over
    const handleGameOver = async () => {
        if (!gameStateRef.current.gameActive) {
            return;
        }

        try {
            const finalScore = gameStateRef.current.currentScore;
            console.log('Game Over - Final Score Details:', {
                scoreFromState: score,
                scoreFromRef: finalScore,
                playerRadius: gameStateRef.current.player.radius,
                startingRadius: STARTING_RADIUS
            });
            
            if (finalScore <= 0) {
                console.warn('Warning: Final score is 0 or negative:', finalScore);
            }
            
            gameStateRef.current.gameActive = false;
            setGameOver(true);
            setIsTransactionPending(true);

            // Save score and get transaction ID
            console.log('Saving score to Arweave:', finalScore);
            const transactionId = await saveScoreToArweave(finalScore);
            console.log('Transaction ID received:', transactionId);
            setTxId(transactionId);
            
            // Start aggressive leaderboard updates
            const updateIntervals = [0, 500, 1000, 2000, 3000, 5000];
            for (const delay of updateIntervals) {
                setTimeout(() => {
                    console.log(`Updating leaderboard after ${delay}ms`);
                    fetchLeaderboardWithRetry();
                }, delay);
            }

            setIsTransactionPending(false);
        } catch (error) {
            console.error('Error handling game over:', error);
            setIsTransactionPending(false);
        }
    };

    // Save score to Arweave
    const saveScoreToArweave = async (score) => {
        console.log('Starting to save score:', score);
        if (!window.arweaveWallet) {
            throw new Error('Arweave wallet not available');
        }

        const activeAddress = await window.arweaveWallet.getActiveAddress();
        const permissions = await window.arweaveWallet.getPermissions();

        if (!activeAddress || !permissions.includes('DISPATCH')) {
            throw new Error('Missing required wallet permissions');
        }

        console.log('Creating transaction with score:', score);
        const gameScoreTx = await arweave.createTransaction({
            data: JSON.stringify({
                game: "Arweave-Agario",
                score: score,
                timestamp: Date.now(),
                address: activeAddress
            })
        });

        gameScoreTx.addTag('App-Name', 'Arweave-Agario');
        gameScoreTx.addTag('Content-Type', 'application/json');
        gameScoreTx.addTag('Type', 'game-score');
        gameScoreTx.addTag('Score', score.toString());
        gameScoreTx.addTag('Unix-Time', Date.now().toString());

        console.log('Dispatching transaction...');
        const result = await window.arweaveWallet.dispatch(gameScoreTx);
        
        if (!result || !result.id) {
            throw new Error('No transaction ID received from dispatch');
        }

        console.log('Transaction dispatched:', result.id);
        
        // Update blockchain score and trigger an immediate leaderboard refresh
        const newBlockchainScore = await fetchOverallScore(activeAddress);
        setBlockchainScore(newBlockchainScore);
        await fetchLeaderboardWithRetry();
        
        return result.id;
    };

    // Effect to keep wallet state in sync
    useEffect(() => {
        const syncWalletState = async () => {
            if (window.arweaveWallet) {
                try {
                    const activeAddress = await window.arweaveWallet.getActiveAddress();
                    const permissions = await window.arweaveWallet.getPermissions();
                    
                    if (activeAddress && permissions.includes('DISPATCH')) {
                        setWalletConnected(true);
                        setWalletAddress(activeAddress);
                    } else {
                        setWalletConnected(false);
                        setWalletAddress('');
                    }
                } catch (error) {
                    console.error('Error syncing wallet state:', error);
                    setWalletConnected(false);
                    setWalletAddress('');
                }
            }
        };

        // Sync initially
        syncWalletState();

        // Set up listeners for wallet state changes
        window.addEventListener('arweaveWalletLoaded', syncWalletState);
        window.addEventListener('walletSwitch', syncWalletState);

        return () => {
            window.removeEventListener('arweaveWalletLoaded', syncWalletState);
            window.removeEventListener('walletSwitch', syncWalletState);
        };
    }, []);

    // Drawing functions
    function drawGrid() {
        const ctx = gameStateRef.current.ctx;
        if (!ctx) return;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        const offsetX = gameStateRef.current.viewport.x % GRID_SIZE;
        const offsetY = gameStateRef.current.viewport.y % GRID_SIZE;

        // Vertical lines
        for (let x = -offsetX; x < gameStateRef.current.viewport.width; x += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, gameStateRef.current.viewport.height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = -offsetY; y < gameStateRef.current.viewport.height; y += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(gameStateRef.current.viewport.width, y);
            ctx.stroke();
        }
    }

    function drawCircle(x, y, radius, color, isPlayer = false) {
        if (!gameStateRef.current.ctx) {
            return;
        }
        
        try {
            gameStateRef.current.ctx.beginPath();
            gameStateRef.current.ctx.arc(x, y, radius, 0, Math.PI * 2);
            gameStateRef.current.ctx.fillStyle = color;
            gameStateRef.current.ctx.fill();
            
            if (isPlayer) {
                // Draw player logo
                const logoSize = radius * 1.5;
                gameStateRef.current.ctx.drawImage(
                    playerLogo,
                    x - logoSize / 2,
                    y - logoSize / 2,
                    logoSize,
                    logoSize
                );
                
                gameStateRef.current.ctx.strokeStyle = '#FFFFFF';
                gameStateRef.current.ctx.lineWidth = 2;
                gameStateRef.current.ctx.stroke();
            }
        } catch (error) {
            console.error('Drawing error:', error);
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
                color: `hsl(${Math.random() * 360}, 70%, 50%)`
            });
        }
    }

    // Bot AI functions
    function initializeBots() {
        gameStateRef.current.bots = [];
        
        // Initialize large bots first
        for (let i = 0; i < LARGE_BOT_COUNT; i++) {
            const spawnQuadrant = Math.floor(Math.random() * 4);
            let x, y;
            
            // Spawn large bots in different quadrants
            switch(spawnQuadrant) {
                case 0: // top-left
                    x = Math.random() * (WORLD_WIDTH * 0.4);
                    y = Math.random() * (WORLD_HEIGHT * 0.4);
                    break;
                case 1: // top-right
                    x = WORLD_WIDTH * 0.6 + Math.random() * (WORLD_WIDTH * 0.4);
                    y = Math.random() * (WORLD_HEIGHT * 0.4);
                    break;
                case 2: // bottom-left
                    x = Math.random() * (WORLD_WIDTH * 0.4);
                    y = WORLD_HEIGHT * 0.6 + Math.random() * (WORLD_HEIGHT * 0.4);
                    break;
                case 3: // bottom-right
                    x = WORLD_WIDTH * 0.6 + Math.random() * (WORLD_WIDTH * 0.4);
                    y = WORLD_HEIGHT * 0.6 + Math.random() * (WORLD_HEIGHT * 0.4);
                    break;
            }

            gameStateRef.current.bots.push({
                x,
                y,
                radius: LARGE_BOT_MIN_RADIUS + Math.random() * (LARGE_BOT_MAX_RADIUS - LARGE_BOT_MIN_RADIUS),
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
        for (let i = 0; i < BOT_COUNT - LARGE_BOT_COUNT; i++) {
            const spawnQuadrant = Math.floor(Math.random() * 4);
            let x, y;
            
            // Spawn regular bots in different quadrants
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

    function updateBotBehavior(bot) {
        const now = Date.now();
        if (now - bot.lastDecision < BOT_DECISION_RATE) {
            return;
        }
        bot.lastDecision = now;

        // Large bots are more likely to chase players
        const randomMovementThreshold = bot.isLargeBot ? 
            BOT_RANDOM_MOVEMENT_CHANCE * 0.5 : 
            BOT_RANDOM_MOVEMENT_CHANCE;

        if (Math.random() < randomMovementThreshold) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 100 + Math.random() * 200;
            bot.targetX = bot.x + Math.cos(angle) * distance;
            bot.targetY = bot.y + Math.sin(angle) * distance;
            return;
        }

        // Get nearby entities with distance calculation
        const nearbyEntities = [];
        
        // Add food
        gameStateRef.current.foods.forEach(food => {
            const dist = getDistance(bot.x, bot.y, food.x, food.y);
            if (dist < BOT_VIEW_RANGE) {
                nearbyEntities.push({ type: 'food', entity: food, dist });
            }
        });

        // Add other bots and player
        [...gameStateRef.current.bots, gameStateRef.current.player].forEach(entity => {
            if (entity === bot) return;
            const dist = getDistance(bot.x, bot.y, entity.x, entity.y);
            if (dist < BOT_VIEW_RANGE) {
                nearbyEntities.push({ 
                    type: 'player', 
                    entity, 
                    dist,
                    canEat: entity.radius * 0.8 < bot.radius,
                    isDangerous: entity.radius > bot.radius * 0.8
                });
            }
        });

        // Sort entities by priority and distance
        nearbyEntities.sort((a, b) => {
            // Prioritize safety first
            if (a.isDangerous && !b.isDangerous) return -1;
            if (!a.isDangerous && b.isDangerous) return 1;
            
            // Then consider opportunities based on personality
            if (bot.personality > 0.7) { // Aggressive bots
                if (a.canEat && !b.canEat) return -1;
                if (!a.canEat && b.canEat) return 1;
            }
            
            // Finally sort by distance
            return a.dist - b.dist;
        });

        if (nearbyEntities.length === 0) {
            // Wander naturally when nothing interesting is nearby
            const angle = Math.random() * Math.PI * 2;
            const distance = 150 + Math.random() * 250;
            bot.targetX = bot.x + Math.cos(angle) * distance;
            bot.targetY = bot.y + Math.sin(angle) * distance;
            return;
        }

        const mostRelevant = nearbyEntities[0];
        
        if (mostRelevant.isDangerous) {
            // Run away from danger
            const angle = Math.atan2(bot.y - mostRelevant.entity.y, bot.x - mostRelevant.entity.x);
            const escapeDistance = 300 + Math.random() * 100;
            bot.targetX = bot.x + Math.cos(angle) * escapeDistance;
            bot.targetY = bot.y + Math.sin(angle) * escapeDistance;
        } else if (mostRelevant.canEat || mostRelevant.type === 'food') {
            // Chase food or smaller entities with some randomness
            const jitter = (Math.random() - 0.5) * 30;
            bot.targetX = mostRelevant.entity.x + jitter;
            bot.targetY = mostRelevant.entity.y + jitter;
        } else {
            // Default wandering behavior with natural movement
            const angle = Math.random() * Math.PI * 2;
            const distance = 100 + Math.random() * 200;
            bot.targetX = bot.x + Math.cos(angle) * distance;
            bot.targetY = bot.y + Math.sin(angle) * distance;
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
                if (checkCollision(bot.x, bot.y, bot.radius, food.x, food.y, food.radius)) {
                    foodToRemove.push(i);
                    bot.radius += FOOD_GROWTH_RATE * 0.8; // Bots grow slightly slower than player from food
                }
            }

            // Remove eaten food
            for (let i = foodToRemove.length - 1; i >= 0; i--) {
                gameStateRef.current.foods.splice(foodToRemove[i], 1);
            }

            // Check collisions with player - do this before drawing
            let skipRemainingCollisions = false;
            if (checkCollision(bot.x, bot.y, bot.radius, gameStateRef.current.player.x, gameStateRef.current.player.y, gameStateRef.current.player.radius)) {
                // If player has less than 200 points
                if (gameStateRef.current.currentScore < 200) {
                    // Can only eat blobs smaller than player
                    if (bot.radius < gameStateRef.current.player.radius) {
                        botsToRemove.push(bot);
                        gameStateRef.current.player.radius += bot.radius * BOT_GROWTH_RATE;
                        gameStateRef.current.currentScore += Math.floor(bot.radius * 10);
                        setScore(gameStateRef.current.currentScore);
                        skipRemainingCollisions = true;
                    }
                    // If bot is bigger or equal, just pass through (do nothing)
                } else {
                    // Normal game mechanics after 200 points
                    if (bot.radius > gameStateRef.current.player.radius * EAT_SIZE_RATIO) {
                        handleGameOver();
                        return;
                    } else if (gameStateRef.current.player.radius > bot.radius * EAT_SIZE_RATIO) {
                        botsToRemove.push(bot);
                        gameStateRef.current.player.radius += bot.radius * BOT_GROWTH_RATE;
                        gameStateRef.current.currentScore += Math.floor(bot.radius * 10);
                        setScore(gameStateRef.current.currentScore);
                        skipRemainingCollisions = true;
                    }
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
                    if (bot.radius > otherBot.radius * EAT_SIZE_RATIO) {
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

    // Initialize game
    const initGame = useCallback(() => {
        if (!canvasRef.current || !gameStateRef.current.ctx) {
            return;
        }

        const gameState = gameStateRef.current;

        // Clear existing arrays
        gameState.foods = [];
        gameState.bots = [];

        // Initialize player position
        gameState.player.x = gameState.viewport.width / 2;
        gameState.player.y = gameState.viewport.height / 2;
        
        // Initialize viewport
        gameState.viewport.x = gameState.viewport.width / 2;
        gameState.viewport.y = gameState.viewport.height / 2;

        // Reset game state
        gameStateRef.current = {
            ...gameStateRef.current,
            player: {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                radius: STARTING_RADIUS,
                color: '#FFFFFF',
                speed: 2
            },
            gameActive: true,
            currentScore: 0  // Reset score in ref
        };
        setScore(0);
        setGameOver(false);
        setTxId(null);
        initializeBots();
        generateFood();
    }, []);

    // Game loop
    const gameLoop = useCallback(() => {
        if (!gameStateRef.current.gameActive || !canvasRef.current || !gameStateRef.current.ctx) {
            return;
        }

        try {
            // Clear canvas
            gameStateRef.current.ctx.fillStyle = '#000000';
            gameStateRef.current.ctx.fillRect(0, 0, gameStateRef.current.viewport.width, gameStateRef.current.viewport.height);

            // Draw grid
            drawGrid();

            // Update and draw bots first (so player appears on top)
            updateBots();

            // Check if game is still active after bot updates
            if (!gameStateRef.current.gameActive) {
                return;
            }

            // Update player position based on mouse
            const dx = gameStateRef.current.mouse.x - gameStateRef.current.viewport.width / 2;
            const dy = gameStateRef.current.mouse.y - gameStateRef.current.viewport.height / 2;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const speed = gameStateRef.current.player.speed * (1 - (gameStateRef.current.player.radius / MAX_RADIUS) * 0.5);
                gameStateRef.current.player.x += (dx / distance) * speed;
                gameStateRef.current.player.y += (dy / distance) * speed;
            }

            // Update viewport to follow player
            gameStateRef.current.viewport.x += (gameStateRef.current.player.x - gameStateRef.current.viewport.x) * CAMERA_LERP;
            gameStateRef.current.viewport.y += (gameStateRef.current.player.y - gameStateRef.current.viewport.y) * CAMERA_LERP;

            // Keep player in bounds
            checkBoundaries(gameStateRef.current.player);

            // Check collisions with food for player
            const foodToRemove = [];
            let currentScore = 0;
            
            for (let i = 0; i < gameStateRef.current.foods.length; i++) {
                const food = gameStateRef.current.foods[i];
                if (checkCollision(
                    gameStateRef.current.player.x,
                    gameStateRef.current.player.y,
                    gameStateRef.current.player.radius,
                    food.x,
                    food.y,
                    food.radius
                )) {
                    foodToRemove.push(i);
                    gameStateRef.current.player.radius += FOOD_GROWTH_RATE;
                    currentScore += 10;
                }
            }

            // Remove eaten food
            for (let i = foodToRemove.length - 1; i >= 0; i--) {
                gameStateRef.current.foods.splice(foodToRemove[i], 1);
            }

            // Spawn new food to maintain food count
            while (gameStateRef.current.foods.length < FOOD_COUNT) {
                gameStateRef.current.foods.push({
                    x: Math.random() * WORLD_WIDTH,
                    y: Math.random() * WORLD_HEIGHT,
                    radius: FOOD_RADIUS,
                    color: `hsl(${Math.random() * 360}, 70%, 50%)`
                });
            }

            // Draw food
            for (const food of gameStateRef.current.foods) {
                const screenX = food.x - gameStateRef.current.viewport.x + gameStateRef.current.viewport.width / 2;
                const screenY = food.y - gameStateRef.current.viewport.y + gameStateRef.current.viewport.height / 2;
                drawCircle(screenX, screenY, food.radius, food.color);
            }

            // Draw player last (on top of everything)
            const screenX = gameStateRef.current.player.x - gameStateRef.current.viewport.x + gameStateRef.current.viewport.width / 2;
            const screenY = gameStateRef.current.player.y - gameStateRef.current.viewport.y + gameStateRef.current.viewport.height / 2;
            drawCircle(screenX, screenY, gameStateRef.current.player.radius, gameStateRef.current.player.color, true);

            // Update score
            gameStateRef.current.currentScore += currentScore;
            setScore(gameStateRef.current.currentScore);

            // Request next frame
            if (gameStateRef.current.gameActive) {
                requestAnimationFrame(gameLoop);
            }
        } catch (error) {
            console.error('Error in game operation:', error);
        }
    }, []);

    // Handle game over separately
    useEffect(() => {
        if (gameOver) {
            handleGameOver();
        }
    }, [gameOver, handleGameOver]);

    // Handle score updates during gameplay
    useEffect(() => {
        const handleScoreUpdate = async () => {
            if (walletConnected && gameStateRef.current.gameActive) {
                // Update blockchain score every 1000 points
                const scoreIncrement = Math.floor(score / 1000) * 1000;
                if (scoreIncrement > 0 && scoreIncrement > blockchainScore) {
                    await saveScoreToArweave(scoreIncrement);
                    const newBlockchainScore = await fetchOverallScore(walletAddress);
                    setBlockchainScore(newBlockchainScore);
                }
            }
        };

        handleScoreUpdate();
    }, [score, walletConnected, blockchainScore, walletAddress]);

    // Update leaderboard
    useEffect(() => {
        fetchLeaderboardWithRetry();
    }, []);

    useEffect(() => {
        let updateInterval;
        if (walletConnected) {
            // Initial fetch
            fetchLeaderboardWithRetry();
            
            // Set up more frequent updates
            updateInterval = setInterval(() => {
                fetchLeaderboardWithRetry();
            }, 3000); // Update every 3 seconds
        }

        return () => {
            if (updateInterval) {
                clearInterval(updateInterval);
            }
        };
    }, [walletConnected]);

    // Update leaderboard when game ends
    useEffect(() => {
        if (gameOver && walletConnected) {
            fetchLeaderboardWithRetry();
        }
    }, [gameOver, walletConnected]);

    // Add periodic leaderboard updates
    useEffect(() => {
        const leaderboardInterval = setInterval(() => {
            if (walletConnected) {
                fetchLeaderboardWithRetry();
            }
        }, 10000); // Update every 10 seconds

        return () => clearInterval(leaderboardInterval);
    }, [walletConnected]);

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
            fetchOverallScore(walletAddress).then(score => setBlockchainScore(score));
            fetchLeaderboardWithRetry();
        }
    }, [walletConnected, walletAddress]);

    // Initialize game
    useEffect(() => {
        const canvas = canvasRef.current;
        const gameState = gameStateRef.current;
        
        if (!canvas) {
            return;
        }
        
        gameState.ctx = canvas.getContext('2d');
        if (!gameState.ctx) {
            return;
        }

        // Set canvas size
        const handleResize = () => {
            if (!canvas || !gameState.ctx) return;
            
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            gameState.viewport.width = canvas.width;
            gameState.viewport.height = canvas.height;
            
            // Reset viewport position
            gameState.viewport.x = canvas.width / 2;
            gameState.viewport.y = canvas.height / 2;
        };

        // Handle mouse movement
        const handleMouseMove = (e) => {
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            gameState.mouse.x = e.clientX - rect.left;
            gameState.mouse.y = e.clientY - rect.top;
        };

        // Add event listeners
        window.addEventListener('resize', handleResize);
        canvas.addEventListener('mousemove', handleMouseMove);

        // Initialize game
        handleResize();
        initGame();
        
        // Start game loop
        gameState.gameActive = true;
        gameLoop();
        
        // Cleanup function
        return () => {
            gameState.gameActive = false;
            window.removeEventListener('resize', handleResize);
            canvas.removeEventListener('mousemove', handleMouseMove);
        };
    }, [gameLoop, initGame]); 

    return (
        <div className="game-container">
            <canvas ref={canvasRef} className="game-canvas" />
            
            {/* Game UI */}
            <div className="game-ui">
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000
                }}>
                    <img 
                        src="https://i.ibb.co/YpnyDKL/Head-Liner.webp"
                        alt="Game Header"
                        style={{
                            maxWidth: '300px',
                            height: 'auto'
                        }}
                    />
                </div>

                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '24px',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '5px'
                }}>
                    <div>Score: {score}</div>
                </div>

                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    zIndex: 1000
                }}>
                    {/* Wallet Button */}
                    <button
                        style={{
                            background: walletConnected ? '#4CAF50' : '#2196F3',
                            border: 'none',
                            color: 'white',
                            padding: '10px 20px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                        onClick={walletConnected ? disconnectWallet : connectWallet}
                    >
                        {walletConnected ? 'Disconnect Wallet' : 'Connect Wallet'}
                    </button>

                    {/* Leaderboard */}
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.7)',
                        padding: '15px',
                        borderRadius: '8px',
                        color: 'white',
                        maxWidth: '250px'
                    }}>
                        <h3 style={{ margin: '0 0 10px 0' }}>Top Players</h3>
                        {leaderboard.map((player, index) => (
                            <div 
                                key={player.address}
                                style={{
                                    padding: '5px 0',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '15px',
                                    color: player.address === walletAddress ? '#4CAF50' : 'white'
                                }}
                            >
                                <span style={{ minWidth: '140px' }}>{`${index + 1}. ${player.address.slice(0, 6)}...${player.address.slice(-4)}`}</span>
                                <span style={{ fontWeight: 'bold' }}>{player.score}</span>
                            </div>
                        ))}
                    </div>

                    {/* Game over overlay */}
                    {gameOver && (
                        <div className="game-over-overlay">
                            <div className="game-over-content">
                                <h2>Game Over!</h2>
                                <p>Final Score: {score}</p>
                                {isTransactionPending ? (
                                    <div className="transaction-info">
                                        <p>Saving score to blockchain...</p>
                                        <div className="loading-spinner"></div>
                                    </div>
                                ) : txId ? (
                                    <div className="transaction-info">
                                        <p>Transaction ID: {txId}</p>
                                        <a 
                                            href={`https://arweave.net/${txId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="view-transaction-button"
                                        >
                                            View Transaction
                                        </a>
                                    </div>
                                ) : null}
                                {!isTransactionPending && txId && (
                                    <button
                                        className="play-again-button"
                                        onClick={() => {
                                            setGameOver(false);
                                            setScore(0);
                                            setTxId(null);
                                            gameStateRef.current.gameActive = true;
                                            initGame();
                                            gameLoop();
                                        }}
                                    >
                                        Play Again
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Game;
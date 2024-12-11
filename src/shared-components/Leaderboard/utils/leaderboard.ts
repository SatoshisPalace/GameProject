import { message, createDataItemSigner, dryrun } from "../../../config/aoConnection";
import { LeaderboardEntry, LeaderboardState, PlayerData, GameStats, TotalGameStats } from "../types/leaderboard";
import { rateLimiter } from "./rateLimiter";

const PROCESS_ID = "iI1AHVB85pQ9_Y67TDPS52PXOjxZOxwNV55JZemYpxM";

// Type guard to check if the entry has the correct shape
function isValidEntry(entry: unknown): entry is { score: string | number; timestamp: string; username?: string } {
    return typeof entry === 'object' && entry !== null && 
           'score' in entry && 
           'timestamp' in entry &&
           (typeof (entry as any).score === 'string' || typeof (entry as any).score === 'number') &&
           typeof (entry as any).timestamp === 'string';
}

export const submitScore = async (
    wallet: any,
    gameId: string,
    score: number,
    username?: string
): Promise<{ id: string }> => {
    try {
        console.log(`[${gameId}] Preparing to submit score...`);
        console.log(`[${gameId}] Parameters:`, {
            walletAddress: wallet.address,
            gameId,
            score,
            username: username || "Anonymous"
        });

        const timestamp = new Date().toISOString();
        console.log(`[${gameId}] Calling AO message with tags:`, {
            Action: "submit-score",
            Score: score.toString(),
            GameId: gameId,
            Username: username || "Anonymous",
            WalletAddress: wallet.address,
            Timestamp: timestamp
        });

        const result = await message({
            process: PROCESS_ID,
            tags: [
                { name: "Action", value: "submit-score" },
                { name: "Score", value: score.toString() },
                { name: "GameId", value: gameId },
                { name: "Username", value: username || "Anonymous" },
                { name: "WalletAddress", value: wallet.address },
                { name: "Timestamp", value: timestamp }
            ],
            signer: createDataItemSigner(window.arweaveWallet),
            data: "Submit score"
        });

        console.log(`[${gameId}] Score submission successful:`, {
            result,
            timestamp,
            processId: PROCESS_ID
        });
        return { id: result };
    } catch (error) {
        console.error(`[${gameId}] Error submitting score:`, error);
        if (error instanceof Error) {
            console.error(`[${gameId}] Error details:`, error.message);
            console.error(`[${gameId}] Error stack:`, error.stack);
        }
        throw error;
    }
};

export const getTopPlayers = async (
    gameId: string,
    page: number = 1,
    pageSize: number = 10
): Promise<LeaderboardEntry[]> => {
    return rateLimiter.executeWithRateLimit(`topPlayers-${gameId}-${page}-${pageSize}`, async () => {
        try {
            const result = await dryrun({
                process: PROCESS_ID,
                tags: [
                    { name: "Action", value: "query-top-players" },
                    { name: "GameId", value: gameId },
                    { name: "Page", value: page.toString() },
                    { name: "PageSize", value: pageSize.toString() }
                ],
                data: ""
            });

            if (!result.Messages?.[0]?.Data) {
                throw new Error("Invalid response from leaderboard");
            }

            const response = JSON.parse(result.Messages[0].Data);
            if (!response.success) {
                throw new Error(response.error || "Failed to get top players");
            }

            const scores = Array.isArray(response.data) ? response.data : [];
            return scores.map((entry: any, index: number) => ({
                rank: index + 1,
                walletAddress: entry.walletAddress,
                username: entry.username || "Anonymous",
                score: Number(entry.score),
                timestamp: entry.timestamp,
                badge: index < 3 ? ["gold", "silver", "bronze"][index] as "gold" | "silver" | "bronze" : undefined
            }));
        } catch (error) {
            console.error("Error getting top players:", error);
            return [];
        }
    });
};

export const getPlayerHistory = async (
    walletAddress: string,
    gameId?: string,
    sortBy: string = "timestamp",
    page: number = 1,
    pageSize: number = 10
): Promise<PlayerData> => {
    return rateLimiter.executeWithRateLimit(
        `playerHistory-${walletAddress}-${gameId}-${page}-${pageSize}`,
        async () => {
            try {
                console.log('Getting player history for wallet:', walletAddress);
                console.log('Game ID:', gameId);
                const result = await dryrun({
                    process: PROCESS_ID,
                    tags: [
                        { name: "Action", value: "query-player-history" },
                        { name: "WalletAddress", value: walletAddress },
                        ...(gameId ? [{ name: "GameId", value: gameId }] : []),
                        { name: "SortBy", value: sortBy },
                        { name: "Page", value: page.toString() },
                        { name: "PageSize", value: pageSize.toString() }
                    ],
                    data: ""
                });

                if (!result.Messages?.[0]?.Data) {
                    console.warn('No messages received from leaderboard query');
                    throw new Error("Invalid response from leaderboard");
                }

                const response = JSON.parse(result.Messages[0].Data);
                console.log('Raw leaderboard response:', response);
                
                if (!response.success) {
                    console.error('Leaderboard query failed:', response.error);
                    throw new Error(response.error || "Failed to get player history");
                }

                const scores = Object.values(response.data || {});
                console.log('Retrieved scores:', scores);
                if (!scores || !Array.isArray(scores)) {
                    return {
                        walletAddress,
                        username: 'Unknown Player',
                        scores: [],
                        totalScore: 0
                    };
                }

                const playerScores = scores.map((entry) => {
                    if (!isValidEntry(entry)) {
                        throw new Error('Invalid entry format in scores');
                    }
                    return {
                        score: Number(entry.score),
                        timestamp: entry.timestamp
                    };
                });

                return {
                    walletAddress,
                    //@ts-ignore
                    username: scores[0]?.username || 'Unknown Player',
                    scores: playerScores,
                    totalScore: playerScores.reduce((sum, entry) => sum + entry.score, 0)
                };
            } catch (error) {
                console.error("Error getting player history:", error);
                return {
                    walletAddress,
                    username: 'Unknown Player',
                    scores: [],
                    totalScore: 0
                };
            }
        }
    );
};

export const getLeaderboardState = async (): Promise<LeaderboardState> => {
    try {
        const result = await dryrun({
            process: PROCESS_ID,
            tags: [{ name: "Action", value: "get-leaderboard-state" }],
            data: ""
        });

        if (!result.Messages?.[0]?.Data) {
            throw new Error("Invalid response from leaderboard");
        }

        const response = JSON.parse(result.Messages[0].Data);
        if (!response.success) {
            throw new Error(response.error || "Failed to get leaderboard state");
        }

        return {
            isLocked: response.data.isLocked,
            scoreCount: response.data.scoreCount,
            entries: [],
            lastUpdate: Date.now()
        };
    } catch (error) {
        console.error("Error getting leaderboard state:", error);
        return {
            isLocked: false,
            scoreCount: 0,
            entries: [],
            lastUpdate: Date.now()
        };
    }
};

export const getTotalPlayers = async (gameId: string): Promise<number> => {
    return rateLimiter.executeWithRateLimit(`totalPlayers-${gameId}`, async () => {
        try {
            const result = await dryrun({
                process: PROCESS_ID,
                tags: [
                    { name: "Action", value: "get-total-players" },
                    { name: "GameId", value: gameId }
                ],
                data: ""
            });

            if (!result.Messages?.[0]?.Data) {
                throw new Error("Invalid response from leaderboard");
            }

            const response = JSON.parse(result.Messages[0].Data);
            if (!response.success) {
                throw new Error(response.error || "Failed to get total players");
            }

            return response.data.totalPlayers;
        } catch (error) {
            console.error("Error getting total players:", error);
            return 0;
        }
    });
};

export const getGameStats = async (gameId: string): Promise<GameStats> => {
    try {
        console.log('Fetching game stats for gameId:', gameId);
        const result = await rateLimiter.executeWithRateLimit(`gameStats-${gameId}`, async () => {
            const res = await dryrun({
                process: PROCESS_ID,
                tags: [
                    { name: 'Action', value: 'query-game-stats' },
                    { name: 'GameId', value: gameId }
                ]
            });

            if (!res.Messages?.[0]?.Data) {
                console.error('Invalid game stats response:', res);
                throw new Error('Invalid response from leaderboard');
            }

            const data = JSON.parse(res.Messages[0].Data);
            console.log('Parsed response:', data);

            if (!data.success) {
                throw new Error(data.error || 'Failed to get game stats');
            }

            // The stats are in data.data, not data.stats
            const statsData = data.data || {};
            console.log('Stats data:', statsData);
            
            const result = {
                totalScore: statsData.totalScore || 0,
                totalplayers: statsData.totalplayers || 0,
                submissionCount: statsData.submissionCount || 0
            };
            
            console.log('Final result:', result);
            return result;
        });

        return result;
    } catch (error) {
        console.error('Error getting game stats:', error);
        return {
            totalScore: 0,
            totalplayers: 0,
            submissionCount: 0
        };
    }
};

export const getTotalGameStats = async (gameId: string): Promise<TotalGameStats> => {
    try {
        console.log(`[${gameId}] Fetching total game stats...`);
        const result = await rateLimiter.executeWithRateLimit(`totalStats-${gameId}`, async () => {
            console.log(`[${gameId}] Making dryrun call to AO process...`);
            const res = await dryrun({
                process: PROCESS_ID,
                tags: [
                    { name: 'Action', value: 'query-game-stats' },
                    { name: 'GameId', value: gameId }
                ]
            });

            console.log(`[${gameId}] Raw total stats response:`, {
                messages: res.Messages?.length || 0,
                hasData: !!res.Messages?.[0]?.Data,
                rawData: res.Messages?.[0]?.Data
            });
            
            if (!res.Messages?.[0]?.Data) {
                console.error(`[${gameId}] Invalid total stats response:`, res);
                throw new Error('Invalid response from leaderboard');
            }

            const data = JSON.parse(res.Messages[0].Data);
            console.log(`[${gameId}] Parsed total stats data:`, data);

            if (!data.success) {
                console.error(`[${gameId}] Failed to get total stats:`, data.error || 'Unknown error');
                throw new Error(data.error || 'Failed to get total stats');
            }

            const stats = data.data || {};
            console.log(`[${gameId}] Extracted stats data:`, stats);
            
            const result = {
                totalGames: stats.totalGames || 0,
                totalPlayers: stats.totalPlayers || 0,
                totalScore: stats.totalScore || 0
            };
            
            console.log(`[${gameId}] Final processed stats:`, result);
            return result;
        });

        console.log(`[${gameId}] Processed total game stats:`, result);
        return result;
    } catch (error) {
        console.error(`[${gameId}] Error getting total game stats:`, error);
        if (error instanceof Error) {
            console.error(`[${gameId}] Error details:`, error.message);
            console.error(`[${gameId}] Error stack:`, error.stack);
        }
        return {
            totalGames: 0,
            totalPlayers: 0,
            totalScore: 0
        };
    }
};

export const getRecentPlayers = async (
    gameId: string,
    limit: number = 5
): Promise<LeaderboardEntry[]> => {
    return rateLimiter.executeWithRateLimit(`recentPlayers-${gameId}-${limit}`, async () => {
        try {
            const result = await dryrun({
                process: PROCESS_ID,
                tags: [
                    { name: "Action", value: "query-last-players" },
                    { name: "GameId", value: gameId },
                    { name: "Limit", value: limit.toString() }
                ],
                data: ""
            });

            if (!result.Messages?.[0]?.Data) {
                throw new Error("Invalid response from leaderboard");
            }

            const response = JSON.parse(result.Messages[0].Data);
            if (!response.success) {
                throw new Error(response.error || "Failed to get recent players");
            }

            const entries = Object.values(response.data || {});
            const mappedEntries = entries.map((entry: any) => ({
                walletAddress: entry.walletAddress,
                username: entry.username || "Anonymous",
                score: Number(entry.score),
                timestamp: entry.timestamp,
                rank: 0 // Not relevant for recent players
            }));

            return mappedEntries;
        } catch (error) {
            console.error("Error getting recent players:", error);
            return [];
        }
    });
};

export const registerGame = async (
    wallet: any,
    gameId: string
): Promise<{ id: string }> => {
    try {
        console.log(`[${gameId}] Registering game in AO process...`);
        
        const result = await message({
            process: PROCESS_ID,
            tags: [
                { name: "Action", value: "register-game" },
                { name: "GameId", value: gameId }
            ],
            signer: createDataItemSigner(window.arweaveWallet),
            data: "Register game"
        });

        console.log(`[${gameId}] Game registration successful:`, {
            result,
            processId: PROCESS_ID
        });
        return { id: result };
    } catch (error) {
        console.error(`[${gameId}] Error registering game:`, error);
        if (error instanceof Error) {
            console.error(`[${gameId}] Error details:`, error.message);
            console.error(`[${gameId}] Error stack:`, error.stack);
        }
        throw error;
    }
};

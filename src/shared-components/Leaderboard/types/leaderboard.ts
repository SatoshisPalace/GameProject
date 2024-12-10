export interface PlayerData {
    walletAddress: string;
    username: string;
    scores: Array<{ score: number; timestamp: string }>;
    totalScore: number;
}

export interface LeaderboardEntry {
    walletAddress: string;
    username: string;
    score: number;
    timestamp: number;
    rank?: number;
}

export interface LeaderboardState {
    isLocked: boolean;
    scoreCount: number;
    entries: LeaderboardEntry[];
    lastUpdate: number;
}

export interface GameStats {
    totalScore: number;
    totalplayers: number;
    submissionCount: number;
}

export interface TotalGameStats {
    totalGames: number;
    totalPlayers: number;
    totalScore: number;
}

export interface Game {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  status: 'live' | 'coming_soon';
}

export const games: Game[] = [
  {
    id: 'PONG',
    title: 'PONG',
    description: 'Experience the timeless classic reimagined for the blockchain era. Compete for high scores!',
    status: 'live',
  },
  {
    id: 'BRICK_BLITZ',
    title: 'Brick Blitz',
    description: 'The legendary puzzle game meets blockchain. Stack, clear lines, and compete for high scores on the blockchain!',
    status: 'live',
  },
  {
    id: 'MAZE_MUNCHER',
    title: 'Maze Muncher',
    description: 'Navigate through the maze, collect coins, and avoid ghosts in this blockchain-powered arcade adventure!',
    status: 'live',
  },
  {
    id: 'FEAST_OR_FAMINE',
    title: 'Feast or Famine',
    description: 'Control your blob and feast or famine in this exciting arcade game. Compete for the highest score!',
    status: 'live',
  },
  {
    id: 'Ghost_Hunt',
    title: 'Ghost Hunt',
    description: 'Play with freinds to survive waves of ghosts. Compete for the highest score!',
    status: 'coming_soon',
  },
];

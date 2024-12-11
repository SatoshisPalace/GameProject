export interface Game {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  status: 'live' | 'coming_soon';
  component: string;
}

export const games: Game[] = [
  {
    id: 'PONG',
    title: 'PONG',
    description: 'Experience the timeless classic reimagined for the blockchain era. Compete for high scores!',
    status: 'live',
    component: 'PongGame'
  },
  {
    id: 'TETRIS',
    title: 'Brick Blitz',
    description: 'The legendary puzzle game meets blockchain. Stack, clear lines, and compete for high scores on the blockchain!',
    status: 'live',
    component: 'TetrisGame'
  },
  {
    id: 'SATOSHIMAN',
    title: 'Maze Muncher',
    description: 'Navigate through the maze, collect coins, and avoid ghosts in this blockchain-powered arcade adventure!',
    status: 'live',
    component: 'SatoshiManGame'
  },
  {
    id: 'FEASTFAMINE',
    title: 'Feast or Famine',
    description: 'Control your blob and feast or famine in this exciting arcade game. Compete for the highest score!',
    status: 'live',
    component: 'FEASTFAMINE'
  },
];

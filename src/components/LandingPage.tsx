/** @jsxImportSource react */
import React, { useState, lazy, Suspense } from 'react';
import styled from 'styled-components';
import WalletConnection from '../shared-components/Wallet/WalletConnection';
import { WalletProvider } from '../shared-components/Wallet/WalletContext';
import type { Game } from '../games/games';
import { games } from '../games/games';
import { GlobalStyle, MainContainer, Header, LogoSection, Logo, FooterLogo } from './HUD';
import '../styles/HeroAnimation.css';


// Lazy load game components
const PongGame = lazy(() => import('../games/PongGame'));
const TetrisGame = lazy(() => import('../games/TetrisGame'));
const SatoshiManGame = lazy(() => import('../games/SatoshiManGame'));
const BlobGame = lazy(() => import('../games/BlobGame'));

const GamesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
  padding: 10px 20px;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const GameTitle = styled.h3`
  font-size: 1.5rem;
  margin-bottom: 10px;
  color: #fff;
`;

const GameDescription = styled.p`
  color: #aaa;
  margin-bottom: 15px;
`;

const GameCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 250px;
  position: relative;

  &:hover {
    transform: translateY(-5px);
    background: rgba(255, 255, 255, 0.1);
  }

  &.coming-soon {
    opacity: 0.7;
    pointer-events: none;
  }
`;

const GameImage = styled.img`
  width: 100%;
  height: 180px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 15px;
`;

const PlayButton = styled.button`
  background: linear-gradient(45deg, #6c5ce7, #8e44ad);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 25px;
  margin-top: 15px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(45deg, #8e44ad, #6c5ce7);
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(108, 92, 231, 0.4);
  }
`;

const GameContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background: #000;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const CloseButton = styled.button`
  position: fixed;
  top: 20px;
  left: 420px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: white;
  font-size: 24px;
  cursor: pointer;
  z-index: 1001;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  backdrop-filter: blur(5px);

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }

  &::before {
    content: '←';
  }
`;

const HeroSection = styled.section`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  position: relative;
  z-index: 1;
  padding-top: 10px;
  margin-bottom: 10px;
`;

const HeroTitle = styled.h1`
  margin: 0;
  padding: 0;
`;

const HeroSubtitle = styled.p`
  font-size: 1.1rem;
  color: #a8a4e6;
  line-height: 1.5;
  margin-bottom: 40px;
`;

const Footer = styled.footer`
  width: 100%;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 40px;
  background: rgba(0, 0, 0, 0.2);
`;

const CopyrightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.8);
  font-family: 'Montserrat', sans-serif;
  font-size: 0.9rem;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
`;

const SocialButton = styled.a`
  cursor: pointer;
  text-decoration: none;
  color: #fff;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: transparent;
  display: flex;
  justify-content: center;
  align-items: center;

  img {
    width: 24px;
    height: 24px;
    filter: invert(1) brightness(100%);
  }
`;

const ExploreTitle = styled.h2`
  font-family: 'Montserrat', sans-serif;
  font-size: 2.5rem;
  color: #ffffff;
  text-align: center;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
  margin-top: -800px;
`;

const CrownIcon = styled.img`
  width: 24px;
  height: 24px;
`;

const ComingSoonOverlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(13, 13, 13, 0.85);
  padding: 15px 40px;
  border-radius: 30px;
  font-size: 1.1rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  z-index: 10;
  pointer-events: none;
  letter-spacing: 3px;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const LandingPage: React.FC = () => {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const handlePlayGame = (game: Game) => {
    setSelectedGame(game);
  };

  const handleCloseGame = () => {
    setSelectedGame(null);
  };

  const renderGameComponent = () => {
    if (!selectedGame) return null;

    return (
      <GameContainer>
        <CloseButton onClick={handleCloseGame}></CloseButton>
        <Suspense fallback={<div>Loading game...</div>}>
          <WalletProvider>
            {selectedGame?.component === 'PongGame' && <PongGame />}
            {selectedGame?.component === 'TetrisGame' && <TetrisGame />}
            {selectedGame?.component === 'SatoshiManGame' && <SatoshiManGame />}
          </WalletProvider>
        </Suspense>
      </GameContainer>
    );
  };

  return (
    <>
      <GlobalStyle />
      <MainContainer>
        <Header>
          <LogoSection>
            <Logo src="/crown.avif" alt="Logo" />
          </LogoSection>
          <WalletProvider>
            <WalletConnection />
          </WalletProvider>
        </Header>

        <HeroSection className="hero-section">
          <HeroTitle className="hero-text">
            <span>Provably</span>
            <span>&nbsp;</span>
            <span>Fair</span>
            <span>&nbsp;</span>
            <span>Gaming</span>
          </HeroTitle>
        </HeroSection>
        
        <div className="hero-section">
          <h2 className="hero-text" style={{ color: '#FFD700', fontSize: '2.5rem' }}>
            <span>Explore</span>
            <span>&nbsp;</span>
            <span>our</span>
            <span>&nbsp;</span>
            <span>games</span>
          </h2>
        </div>

        <GamesGrid>
          {games.map((game: Game) => (
            <div key={game.id} style={{ position: 'relative' }}>
              <GameCard onClick={() => handlePlayGame(game)} className={game.status === 'coming_soon' ? 'coming-soon' : ''}>
                <GameTitle>{game.title}</GameTitle>
                <GameImage src={game.thumbnail || "/placeholder.jpg"} alt={game.title} />
                <GameDescription>{game.description}</GameDescription>
                <PlayButton>
                  Play Now
                </PlayButton>
              </GameCard>
              {game.status === 'coming_soon' && <ComingSoonOverlay>COMING SOON</ComingSoonOverlay>}
            </div>
          ))}
        </GamesGrid>
        {renderGameComponent()}
        <Footer>
          <CopyrightSection>
            <FooterLogo src="./crown.avif" alt="Crown" />
            <span>Copyright 2024 Satoshi's palace. All Rights Reserved</span>
          </CopyrightSection>
          <ButtonContainer>
            <SocialButton href="https://discord.com" target="_blank" rel="noopener noreferrer">
              <img src="/discord.png" alt="Discord" />
            </SocialButton>
            <SocialButton href="https://x.com" target="_blank" rel="noopener noreferrer">
              <img src="/x.png" alt="X" />
            </SocialButton>
            <SocialButton href="https://telegram.org" target="_blank" rel="noopener noreferrer">
              <img src="/telegram.png" alt="Telegram" />
            </SocialButton>
          </ButtonContainer>
        </Footer>
      </MainContainer>
    </>
  );
};

export default LandingPage;

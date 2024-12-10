import React from 'react';
import styled, { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    height: 100%;
    background: #000000;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
    &::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Opera */
    }
  }

  body {
    margin: 0;
    padding: 0;
    min-height: 100vh;
    background: #000000;
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
    &::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Opera */
    }
  }

  #root {
    min-height: 100vh;
    background: #000000;
    display: flex;
    flex-direction: column;
  }
`;

export const MainContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  position: relative;
  background: #000000;
  color: white;
  display: flex;
  flex-direction: column;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 10% 20%, rgba(108, 92, 231, 0.15) 0%, transparent 35%),
      radial-gradient(circle at 90% 80%, rgba(108, 92, 231, 0.15) 0%, transparent 35%);
    pointer-events: none;
    z-index: 0;
  }
`;

export const Header = styled.header`
  height: 100px;
  margin: 0;
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

export const LogoSection = styled.div`
  display: flex;
  align-items: center;
`;

export const Logo = styled.img`
  height: 40px;
  width: auto;
`;

export const FooterLogo = styled(Logo)`
  height: 50px;
`;

export const WalletWrapper = styled.div`
  position: fixed;
  top: 20px;
  right: 40px;
  z-index: 1001;
`;

const HUDContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  z-index: 1000;
`;

const Score = styled.div`
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  color: #6c5ce7;
  font-size: 36px;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(108, 92, 231, 0.5);
  background: rgba(0, 0, 0, 0.8);
  padding: 15px 30px;
  border-radius: 15px;
  border: 2px solid #6c5ce7;
  box-shadow: 0 0 20px rgba(108, 92, 231, 0.3);
`;

import React from 'react';
import { createRoot } from 'react-dom/client';
import LandingPage from './components/LandingPage';
import { GlobalStyle } from './components/HUD';

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <>
      <GlobalStyle />
      <LandingPage />
    </>
  </React.StrictMode>
);

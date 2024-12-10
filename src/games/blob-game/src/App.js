import React from 'react';
import Game from './components/Game';
import './App.css';

function App() {
  console.log('Rendering App component');
  return (
    <div className="App" style={{ 
      width: '100vw', 
      height: '100vh', 
      margin: 0, 
      padding: 0, 
      overflow: 'hidden',
      position: 'relative'
    }}>
      <Game />
    </div>
  );
}

export default App;

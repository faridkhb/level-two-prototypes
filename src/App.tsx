import { useState } from 'react';
import { PlanningPhase } from './components/planning';
import { MainMenu } from './components/menu';
import { ConfigScreen } from './components/config';
import { VERSION } from './version';
import './App.css';

type Screen = 'menu' | 'testMode' | 'config';

function App() {
  const [screen, setScreen] = useState<Screen>('menu');

  return (
    <div className="app">
      <main className="app-main">
        {screen === 'menu' && (
          <MainMenu
            onTestMode={() => setScreen('testMode')}
            onConfig={() => setScreen('config')}
          />
        )}
        {screen === 'testMode' && <PlanningPhase />}
        {screen === 'config' && <ConfigScreen onBack={() => setScreen('menu')} />}
      </main>

      <div className="version-badge">{VERSION}</div>
    </div>
  );
}

export default App;

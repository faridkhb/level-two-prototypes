import { useState } from 'react';
import { PlanningPhase } from './components/planning';
import { MainMenu } from './components/menu';
import { ConfigScreen } from './components/config';
import { VERSION } from './version';
import './App.css';

type Screen = 'menu' | 'testMode' | 'config';

/** Show phone frame on desktop unless ?embed is in the URL */
const isEmbed = new URLSearchParams(window.location.search).has('embed');
const isDesktop = window.innerWidth > 480;

function PhoneFrame() {
  return (
    <div className="phone-frame">
      <div className="phone-frame__bezel">
        <div className="phone-frame__notch" />
        <iframe
          className="phone-frame__screen"
          src={`${window.location.pathname}?embed=1`}
          title="Mobile Preview"
        />
      </div>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState<Screen>('menu');

  // Desktop without ?embed → show phone frame preview
  if (isDesktop && !isEmbed) {
    return <PhoneFrame />;
  }

  return (
    <div className="app">
      <header className="app-header">
        {screen !== 'menu' && (
          <button className="app-header__back" onClick={() => setScreen('menu')}>
            Back
          </button>
        )}
        <h1>BG Planner</h1>
      </header>

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

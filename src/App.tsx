import { useState, useCallback } from 'react';
import { PlanningPhase } from './components/planning';
import { MainMenu } from './components/menu';
import { ConfigScreen } from './components/config';
import { TutorialLevelSelect } from './components/tutorial/TutorialLevelSelect';
import { VERSION } from './version';
import { useGameStore } from './store/gameStore';
import { loadLevel } from './config/loader';
import './App.css';

type Screen = 'menu' | 'testMode' | 'config' | 'tutorialSelect' | 'tutorialPlay';

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
  const { setLevel, setTutorialMode } = useGameStore();

  const handleTutorialLevelSelect = useCallback(async (levelId: string) => {
    const level = await loadLevel(levelId);
    setLevel(level);
    setTutorialMode(true, levelId);
    setScreen('tutorialPlay');
  }, [setLevel, setTutorialMode]);

  const handleBackToTutorials = useCallback(() => {
    setTutorialMode(false, null);
    setScreen('tutorialSelect');
  }, [setTutorialMode]);

  const handleNextTutorialLevel = useCallback(async (nextLevelId: string) => {
    const level = await loadLevel(nextLevelId);
    setLevel(level);
    setTutorialMode(true, nextLevelId);
    // Stay on tutorialPlay screen — level resets via setLevel
  }, [setLevel, setTutorialMode]);

  // Desktop without ?embed → show phone frame preview
  if (isDesktop && !isEmbed) {
    return <PhoneFrame />;
  }

  return (
    <div className="app">
      <main className="app-main">
        {screen === 'menu' && (
          <MainMenu
            onTestMode={() => setScreen('testMode')}
            onTutorial={() => setScreen('tutorialSelect')}
            onConfig={() => setScreen('config')}
          />
        )}
        {screen === 'testMode' && <PlanningPhase />}
        {screen === 'config' && <ConfigScreen onBack={() => setScreen('menu')} />}
        {screen === 'tutorialSelect' && (
          <TutorialLevelSelect
            onSelectLevel={handleTutorialLevelSelect}
            onBack={() => setScreen('menu')}
          />
        )}
        {screen === 'tutorialPlay' && (
          <PlanningPhase
            isTutorial
            onBackToTutorials={handleBackToTutorials}
            onNextLevel={handleNextTutorialLevel}
          />
        )}
      </main>

      <div className="version-badge">{VERSION}</div>
    </div>
  );
}

export default App;

import './MainMenu.css';

interface MainMenuProps {
  onTestMode: () => void;
  onTutorial: () => void;
  onConfig: () => void;
}

export function MainMenu({ onTestMode, onTutorial, onConfig }: MainMenuProps) {
  return (
    <div className="main-menu">
      <div className="main-menu__buttons">
        <button className="main-menu__btn main-menu__btn--test" onClick={onTestMode}>
          TEST MODE
        </button>
        <button className="main-menu__btn main-menu__btn--tutorial" onClick={onTutorial}>
          TUTORIAL LEVELS
        </button>
        <button className="main-menu__btn main-menu__btn--config" onClick={onConfig}>
          CONFIG
        </button>
      </div>
    </div>
  );
}

import './MainMenu.css';

interface MainMenuProps {
  onTestMode: () => void;
  onConfig: () => void;
}

export function MainMenu({ onTestMode, onConfig }: MainMenuProps) {
  return (
    <div className="main-menu">
      <div className="main-menu__buttons">
        <button className="main-menu__btn main-menu__btn--test" onClick={onTestMode}>
          TEST MODE
        </button>
        <button className="main-menu__btn main-menu__btn--story" disabled>
          STORY MODE
          <span className="main-menu__btn-sub">Coming soon</span>
        </button>
        <button className="main-menu__btn main-menu__btn--config" onClick={onConfig}>
          CONFIG
        </button>
      </div>
    </div>
  );
}

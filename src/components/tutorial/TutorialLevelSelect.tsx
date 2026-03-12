import './TutorialLevelSelect.css';

interface TutorialLevel {
  id: string;
  name: string;
  days: number;
  emoji: string;
  gradient: string;
}

const TUTORIAL_LEVELS: TutorialLevel[] = [
  { id: 'tutorial-01', name: 'First Steps', days: 3, emoji: '\ud83c\udf4c', gradient: 'linear-gradient(135deg, #60a5fa, #2563eb)' },
  { id: 'tutorial-02', name: 'Keep Moving', days: 3, emoji: '\ud83d\udeb6', gradient: 'linear-gradient(135deg, #4ade80, #16a34a)' },
  { id: 'tutorial-03', name: 'Willpower Mgmt', days: 3, emoji: '\u2615', gradient: 'linear-gradient(135deg, #fbbf24, #d97706)' },
  { id: 'tutorial-04', name: 'Insulin Rhythm', days: 2, emoji: '\ud83d\udcca', gradient: 'linear-gradient(135deg, #fb923c, #ea580c)' },
  { id: 'tutorial-05', name: 'Under Stress', days: 3, emoji: '\ud83e\uddd8', gradient: 'linear-gradient(135deg, #2dd4bf, #0f766e)' },
  { id: 'tutorial-06', name: 'First Medication', days: 2, emoji: '\ud83d\udc8a', gradient: 'linear-gradient(135deg, #a78bfa, #7c3aed)' },
  { id: 'tutorial-07', name: 'Threshold Drain', days: 2, emoji: '\ud83e\uddea', gradient: 'linear-gradient(135deg, #f472b6, #db2777)' },
  { id: 'tutorial-08', name: 'GLP-1', days: 2, emoji: '\ud83d\udc89', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
  { id: 'tutorial-09', name: 'Final Exam', days: 3, emoji: '\ud83c\udfc6', gradient: 'linear-gradient(135deg, #f87171, #dc2626)' },
];

interface TutorialLevelSelectProps {
  onSelectLevel: (levelId: string) => void;
  onBack: () => void;
}

export function TutorialLevelSelect({ onSelectLevel, onBack }: TutorialLevelSelectProps) {
  return (
    <div className="tutorial-select">
      <button className="tutorial-select__back" onClick={onBack}>
        {'\u2190'} Back
      </button>

      <h1 className="tutorial-select__title">Tutorial Levels</h1>

      <div className="tutorial-select__grid">
        {TUTORIAL_LEVELS.map((level, index) => (
          <button
            key={level.id}
            className="tutorial-select__card"
            onClick={() => onSelectLevel(level.id)}
          >
            <div className="tutorial-select__card-bg" style={{ background: level.gradient }} />
            <div className="tutorial-select__card-content">
              <span className="tutorial-select__card-number">{index + 1}</span>
              <span className="tutorial-select__card-emoji">{level.emoji}</span>
              <span className="tutorial-select__card-name">{level.name}</span>
              <span className="tutorial-select__card-days">{level.days} days</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

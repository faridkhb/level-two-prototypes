import './TutorialLevelSelect.css';

interface TutorialLevel {
  id: string;
  name: string;
  days: number;
  emoji: string;
  gradient: string;
  daysLabel?: string;
}

const TUTORIAL_LEVELS: TutorialLevel[] = [
  { id: 'tutorial-01', name: 'First Steps',      days: 3, emoji: '\ud83c\udf4c', gradient: 'linear-gradient(135deg, #60a5fa, #2563eb)' },
  { id: 'tutorial-02', name: 'Eat in Balance',   days: 3, emoji: '\ud83e\udd57', gradient: 'linear-gradient(135deg, #34d399, #059669)' },
  { id: 'tutorial-03', name: 'Exercises',         days: 3, emoji: '\ud83d\udeb6', gradient: 'linear-gradient(135deg, #4ade80, #16a34a)' },
  { id: 'tutorial-04', name: 'Pancreas Fatigue',  days: 3, emoji: '\ud83e\udec0', gradient: 'linear-gradient(135deg, #f97316, #c2410c)' },
  { id: 'tutorial-07', name: 'Under Stress',      days: 3, emoji: '\ud83e\uddd8', gradient: 'linear-gradient(135deg, #2dd4bf, #0f766e)' },
  { id: 'tutorial-08', name: 'SGLT2',             days: 2, emoji: '\ud83e\uddea', gradient: 'linear-gradient(135deg, #f472b6, #db2777)' },
  { id: 'tutorial-05', name: 'Willpower Mgmt',    days: 2, emoji: '\u2615',       gradient: 'linear-gradient(135deg, #fbbf24, #d97706)' },
  { id: 'tutorial-09', name: 'GLP-1',             days: 2, emoji: '\ud83d\udc89', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
  { id: 'tutorial-06', name: 'External Insulin',  days: 3, emoji: '\ud83d\udcca', gradient: 'linear-gradient(135deg, #fb923c, #ea580c)' },
  { id: 'tutorial-10', name: 'Final Exam',        days: 3, emoji: '\ud83c\udfc6', gradient: 'linear-gradient(135deg, #f87171, #dc2626)' },
  { id: 'test-level',  name: 'Test Level',        days: 1, emoji: '\ud83c\udfae', gradient: 'linear-gradient(135deg, #94a3b8, #334155)', daysLabel: 'Free play' },
];

interface TutorialLevelSelectProps {
  onSelectLevel: (levelId: string) => void;
}

export function TutorialLevelSelect({ onSelectLevel }: TutorialLevelSelectProps) {
  return (
    <div className="tutorial-select">
      <h1 className="tutorial-select__title">Tutorial Levels</h1>

      <div className="tutorial-select__grid">
        {TUTORIAL_LEVELS.map((level, index) => {
          const tileStatus = index === 4 ? 'wip' : index >= 5 && index <= 9 ? 'outdated' : null;
          return (
            <button
              key={level.id}
              className={`tutorial-select__card${tileStatus ? ` tutorial-tile--${tileStatus}` : ''}`}
              onClick={() => onSelectLevel(level.id)}
            >
              <div className="tutorial-select__card-bg" style={{ background: level.gradient }} />
              <div className="tutorial-select__card-content">
                <span className="tutorial-select__card-number">{index + 1}</span>
                <span className="tutorial-select__card-emoji">{level.emoji}</span>
                <span className="tutorial-select__card-name">{level.name}</span>
                <span className="tutorial-select__card-days">
                  {level.daysLabel ?? `${level.days} days`}
                </span>
              </div>
              {tileStatus && (
                <span className={`tutorial-tile__status-badge tutorial-tile__status-badge--${tileStatus}`}>
                  {tileStatus === 'wip' ? 'WIP' : 'Outdated'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

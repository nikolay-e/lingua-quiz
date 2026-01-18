import { useTranslation } from 'react-i18next';
import { Languages, BrainCircuit, TrendingUp, Volume2 } from 'lucide-react';

export function QuizWelcome(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <>
      <header className="flex items-center gap-2 mb-4">
        <h1 className="m-0 text-primary text-xl flex items-center gap-2">
          <Languages size={28} /> LinguaQuiz
        </h1>
      </header>

      <div className="text-center p-6">
        <h3>{t('quiz.welcome')}</h3>
        <p className="text-muted-foreground mb-4">{t('quiz.welcomeDesc')}</p>
        <div className="flex flex-col gap-2 mb-4">
          <a
            href="https://github.com/nikolay-e/lingua-quiz/blob/main/CLAUDE.md#learning-algorithm"
            target="_blank"
            rel="noopener noreferrer"
            className="feature feature-link"
            aria-label={`${t('quiz.featureAdaptive')} (opens in new window)`}
          >
            <span className="feature-icon">
              <BrainCircuit size={20} />
            </span>
            {t('quiz.featureAdaptive')}
          </a>
          <div className="feature">
            <span className="feature-icon">
              <TrendingUp size={20} />
            </span>
            {t('quiz.featureProgress')}
          </div>
          <div className="feature">
            <span className="feature-icon">
              <Volume2 size={20} />
            </span>
            {t('quiz.featureTTS')}
          </div>
        </div>
      </div>

      <style>{`
        .feature {
          display: flex;
          align-items: center;
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--color-muted);
          border-radius: var(--radius-md);
          transition: all var(--transition-speed) ease;
        }

        .feature-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-right: var(--spacing-sm);
          transition: transform var(--transition-speed) ease;
        }

        .feature:hover .feature-icon {
          transform: scale(1.15);
        }

        .feature-link {
          text-decoration: none;
          color: inherit;
          cursor: pointer;
        }

        .feature-link:hover {
          background-color: var(--color-primary);
          color: var(--color-primary-foreground);
          transform: translateY(-1px);
          box-shadow: var(--shadow-button-hover);
        }
      `}</style>
    </>
  );
}

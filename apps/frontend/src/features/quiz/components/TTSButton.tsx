import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2 } from 'lucide-react';
import { Button } from '@shared/ui';
import { ttsService, type TTSState } from '../services/tts-service';

interface TTSButtonProps {
  token: string;
  text: string;
  language: string;
}

export function TTSButton({ token, text, language }: TTSButtonProps): React.JSX.Element {
  const { t } = useTranslation();
  const [ttsState, setTtsState] = useState<TTSState>({
    isAvailable: false,
    supportedLanguages: [],
    isPlaying: false,
  });

  const canUseTTS = ttsService.canUseTTS(language);

  useEffect(() => {
    const unsubscribe = ttsService.subscribe((state) => {
      setTtsState(state);
    });

    return () => {
      unsubscribe();
      ttsService.stopCurrentAudio();
    };
  }, []);

  const handlePlay = () => {
    void ttsService.playTTS(token, text, language);
  };

  if (!canUseTTS) {
    return (
      <span className="text-sm text-muted-foreground" aria-live="polite">
        {t('quiz.ttsUnavailable', { language: language !== '' ? language : 'this language' })}
      </span>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={ttsState.isPlaying ? 'speaking' : ''}
      onClick={handlePlay}
      disabled={ttsState.isPlaying}
      aria-label={t('quiz.listenPronunciation')}
    >
      <Volume2 size={16} />
      <span>{ttsState.isPlaying ? t('quiz.playing') : t('quiz.listen')}</span>
    </Button>
  );
}

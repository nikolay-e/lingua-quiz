import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Play, Pause, X } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { WaveformDisplay } from './WaveformDisplay';
import { Button } from '@shared/ui';
import { cn } from '@shared/utils';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  disabled?: boolean;
  onRecordingStateChange?: (isRecording: boolean) => void;
  toggleRef?: React.MutableRefObject<(() => void) | null>;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioRecorder({
  onRecordingComplete,
  disabled = false,
  onRecordingStateChange,
  toggleRef,
}: AudioRecorderProps): React.JSX.Element {
  const { isRecording, audioBlob, audioData, duration, startRecording, stopRecording, clearRecording } =
    useAudioRecorder();

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const handleStopPlayback = useCallback(() => {
    if (audioRef.current !== null) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current !== null) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const handleToggleRecording = useCallback(async () => {
    if (disabled) return;
    try {
      if (isRecording) {
        const blob = await stopRecording();
        onRecordingComplete(blob);
      } else {
        handleStopPlayback();
        clearRecording();
        await startRecording();
      }
    } catch {
      // Microphone permission denied or not available
    }
  }, [disabled, isRecording, stopRecording, onRecordingComplete, handleStopPlayback, clearRecording, startRecording]);

  useEffect(() => {
    onRecordingStateChange?.(isRecording);
  }, [isRecording, onRecordingStateChange]);

  useEffect(() => {
    if (toggleRef !== undefined) {
      toggleRef.current = handleToggleRecording;
    }
  }, [toggleRef, handleToggleRecording]);

  useEffect(() => {
    return () => {
      if (audioRef.current !== null) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current !== null) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  const handlePlayback = () => {
    if (audioBlob === null) return;

    if (isPlaying && audioRef.current !== null) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (audioUrlRef.current !== null) {
      URL.revokeObjectURL(audioUrlRef.current);
    }
    audioUrlRef.current = URL.createObjectURL(audioBlob);
    audioRef.current = new Audio(audioUrlRef.current);
    audioRef.current.onended = () => setIsPlaying(false);
    void audioRef.current.play();
    setIsPlaying(true);
  };

  const handleClear = () => {
    handleStopPlayback();
    clearRecording();
  };

  return (
    <div className="flex flex-col gap-4">
      <WaveformDisplay audioData={audioData} isRecording={isRecording} />

      <div className="flex items-center justify-center gap-3">
        {audioBlob !== null && !isRecording && (
          <Button
            variant="secondary"
            size="icon"
            onClick={handlePlayback}
            aria-label={isPlaying ? 'Pause playback' : 'Play recording'}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </Button>
        )}

        <Button
          variant={isRecording ? 'destructive' : 'default'}
          onClick={handleToggleRecording}
          disabled={disabled}
          className={cn('w-16 h-16 rounded-full', isRecording && 'animate-pulse')}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? <Square size={24} /> : <Mic size={28} />}
        </Button>

        {audioBlob !== null && !isRecording && (
          <Button variant="ghost" size="icon" onClick={handleClear} aria-label="Clear recording">
            <X size={20} />
          </Button>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground m-0">
        {isRecording && `Recording ${formatDuration(duration)}... Click to stop`}
        {!isRecording && audioBlob !== null && `Recorded (${formatDuration(duration)}) — click to play`}
        {!isRecording && audioBlob === null && 'Click to start recording'}
      </p>
    </div>
  );
}

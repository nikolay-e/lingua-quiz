import { useState, useRef, useCallback, useEffect } from 'react';
import { AUDIO } from '../lib/constants';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioData: Float32Array | null;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  clearRecording: () => void;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const timerIdRef = useRef<number | null>(null);

  const updateWaveform = useCallback(() => {
    if (analyserRef.current === null) return;

    const dataArray = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(dataArray);
    setAudioData(new Float32Array(dataArray));

    animationIdRef.current = requestAnimationFrame(updateWaveform);
  }, []);

  const updateWaveformRef = useRef(updateWaveform);
  updateWaveformRef.current = updateWaveform;

  useEffect(() => {
    return () => {
      if (timerIdRef.current !== null) clearInterval(timerIdRef.current);
      if (animationIdRef.current !== null) cancelAnimationFrame(animationIdRef.current);
      if (audioContextRef.current !== null && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: AUDIO.SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    audioContextRef.current = new AudioContext();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = AUDIO.FFT_SIZE;
    source.connect(analyserRef.current);

    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });
    chunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorderRef.current.start(AUDIO.TIMESLICE_MS);
    setIsRecording(true);
    setAudioBlob(null);
    setDuration(0);
    updateWaveformRef.current();

    timerIdRef.current = globalThis.window.setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  }, []);

  const cleanupRecordingResources = useCallback(() => {
    mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());

    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current);
    }
    if (audioContextRef.current !== null && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (timerIdRef.current !== null) {
      clearInterval(timerIdRef.current);
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current === null) {
        resolve(new Blob());
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        resolve(blob);
        cleanupRecordingResources();
      };

      mediaRecorderRef.current.stop();
      setIsRecording(false);
    });
  }, [cleanupRecordingResources]);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    setAudioData(null);
    setDuration(0);
    chunksRef.current = [];
  }, []);

  return {
    isRecording,
    audioBlob,
    audioData,
    duration,
    startRecording,
    stopRecording,
    clearRecording,
  };
}

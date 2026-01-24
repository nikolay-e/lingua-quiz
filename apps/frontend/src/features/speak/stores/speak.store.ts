import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { Attempt, PronunciationScores, LanguageCode } from '../types';
import { SCORING, DEFAULT_AZURE_REGION, STORAGE_KEY } from '../lib/constants';
import api from '@api/api';

interface SpeakState {
  azureApiKey: string;
  azureRegion: string;
  serverAzureApiKey: string;
  serverAzureRegion: string;
  serverConfigLoaded: boolean;
  passThreshold: number;
  language: LanguageCode;
  attempts: Attempt[];
  streakDays: number;
  lastPracticeDate: string | null;
}

interface SpeakActions {
  setAzureCredentials: (key: string, region: string) => void;
  loadServerConfig: () => Promise<void>;
  setPassThreshold: (threshold: number) => void;
  setLanguage: (language: LanguageCode) => void;
  recordAttempt: (text: string, scores: PronunciationScores, passed: boolean) => void;
  resetProgress: () => void;
}

type SpeakStore = SpeakState & SpeakActions;

const initialState: SpeakState = {
  azureApiKey: '',
  azureRegion: DEFAULT_AZURE_REGION,
  serverAzureApiKey: '',
  serverAzureRegion: '',
  serverConfigLoaded: false,
  passThreshold: SCORING.DEFAULT_THRESHOLD,
  language: 'en-US',
  attempts: [],
  streakDays: 0,
  lastPracticeDate: null,
};

export const useSpeakStore = create<SpeakStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        setAzureCredentials: (key, region) => set({ azureApiKey: key, azureRegion: region }),

        loadServerConfig: async () => {
          if (get().serverConfigLoaded) return;
          try {
            const config = await api.fetchPublicConfig();
            set({
              serverAzureApiKey: config.azure_speech_api_key,
              serverAzureRegion: config.azure_speech_region,
              serverConfigLoaded: true,
            });
          } catch {
            set({ serverConfigLoaded: true });
          }
        },

        setPassThreshold: (threshold) => set({ passThreshold: threshold }),

        setLanguage: (language) => set({ language }),

        recordAttempt: (text, scores, passed) => {
          const attempt: Attempt = {
            id: crypto.randomUUID(),
            text,
            timestamp: new Date().toISOString(),
            scores,
            passed,
          };

          const todayParts = new Date().toISOString().split('T');
          const today = todayParts[0] ?? new Date().toISOString().slice(0, 10);
          const { lastPracticeDate: lastDate, streakDays: currentStreak } = get();
          let streakDays = currentStreak;

          if (lastDate !== null && lastDate !== '') {
            const lastDateObj = new Date(lastDate);
            const todayObj = new Date(today);
            const diffDays = Math.floor((todayObj.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
              streakDays += 1;
            } else if (diffDays > 1) {
              streakDays = 1;
            }
          } else {
            streakDays = 1;
          }

          set({
            attempts: [...get().attempts, attempt],
            streakDays,
            lastPracticeDate: today,
          });
        },

        resetProgress: () =>
          set({
            attempts: [],
            streakDays: 0,
            lastPracticeDate: null,
          }),
      }),
      {
        name: STORAGE_KEY,
        partialize: (state) => ({
          azureApiKey: state.azureApiKey,
          azureRegion: state.azureRegion,
          passThreshold: state.passThreshold,
          language: state.language,
          attempts: state.attempts.slice(-100),
          streakDays: state.streakDays,
          lastPracticeDate: state.lastPracticeDate,
        }),
      },
    ),
  ),
);

export const useAzureApiKey = () => useSpeakStore((s) => (s.azureApiKey !== '' ? s.azureApiKey : s.serverAzureApiKey));
export const useAzureRegion = () => useSpeakStore((s) => (s.azureRegion !== '' ? s.azureRegion : s.serverAzureRegion));
export const useHasAzureCredentials = () =>
  useSpeakStore((s) => {
    const key = s.azureApiKey !== '' ? s.azureApiKey : s.serverAzureApiKey;
    const region = s.azureRegion !== '' ? s.azureRegion : s.serverAzureRegion;
    return key !== '' && region !== '';
  });
export const useServerConfigLoaded = () => useSpeakStore((s) => s.serverConfigLoaded);
export const usePassThreshold = () => useSpeakStore((s) => s.passThreshold);
export const useSpeakLanguage = () => useSpeakStore((s) => s.language);
export const useAttempts = () => useSpeakStore((s) => s.attempts);
export const useStreakDays = () => useSpeakStore((s) => s.streakDays);

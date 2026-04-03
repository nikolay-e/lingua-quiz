import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { Attempt, PronunciationScores, LanguageCode } from '../types';
import { SCORING, STORAGE_KEY } from '../lib/constants';

interface SpeakState {
  passThreshold: number;
  language: LanguageCode;
  listName: string | null;
  attempts: Attempt[];
  streakDays: number;
  lastPracticeDate: string | null;
}

interface SpeakActions {
  setPassThreshold: (threshold: number) => void;
  setLanguage: (language: LanguageCode) => void;
  setListName: (listName: string | null) => void;
  recordAttempt: (text: string, scores: PronunciationScores, passed: boolean) => void;
  resetProgress: () => void;
}

type SpeakStore = SpeakState & SpeakActions;

const initialState: SpeakState = {
  passThreshold: SCORING.DEFAULT_THRESHOLD,
  language: 'en-US',
  listName: null,
  attempts: [],
  streakDays: 0,
  lastPracticeDate: null,
};

export const useSpeakStore = create<SpeakStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        setPassThreshold: (threshold) => set({ passThreshold: threshold }),

        setLanguage: (language) => set({ language }),

        setListName: (listName) => set({ listName }),

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
          passThreshold: state.passThreshold,
          language: state.language,
          listName: state.listName,
          attempts: state.attempts.slice(-100),
          streakDays: state.streakDays,
          lastPracticeDate: state.lastPracticeDate,
        }),
      },
    ),
  ),
);

export const usePassThreshold = () => useSpeakStore((s) => s.passThreshold);
export const useSpeakLanguage = () => useSpeakStore((s) => s.language);
export const useSpeakListName = () => useSpeakStore((s) => s.listName);
export const useAttempts = () => useSpeakStore((s) => s.attempts);
export const useStreakDays = () => useSpeakStore((s) => s.streakDays);

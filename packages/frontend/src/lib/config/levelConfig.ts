import type { LevelKey } from '@lingua-quiz/domain';
import type { ComponentType } from 'svelte';
import { List, ListTodo, CheckCircle, Star, Trophy } from 'lucide-svelte';

export interface LevelConfigItem {
  id: string;
  key: LevelKey;
  label: string;
  icon: ComponentType;
  description: (sourceLanguage: string, targetLanguage: string) => string;
}

export const LEVEL_CONFIG: readonly LevelConfigItem[] = [
  {
    id: 'level0',
    key: 'LEVEL_0',
    label: 'New',
    icon: List,
    description: (sourceLanguage: string, targetLanguage: string) =>
      `New Words Practice (${sourceLanguage} ➔ ${targetLanguage})`,
  },
  {
    id: 'level1',
    key: 'LEVEL_1',
    label: 'Learning',
    icon: ListTodo,
    description: (sourceLanguage: string, targetLanguage: string) =>
      `New Words Practice (${sourceLanguage} ➔ ${targetLanguage})`,
  },
  {
    id: 'level2',
    key: 'LEVEL_2',
    label: 'Translation Mastered One Way',
    icon: CheckCircle,
    description: (sourceLanguage: string, targetLanguage: string) =>
      `Reverse Practice (${targetLanguage} ➔ ${sourceLanguage})`,
  },
  {
    id: 'level3',
    key: 'LEVEL_3',
    label: 'Translation Mastered Both Ways',
    icon: CheckCircle,
    description: (sourceLanguage: string, targetLanguage: string) =>
      `Context Practice (${sourceLanguage} ➔ ${targetLanguage})`,
  },
  {
    id: 'level4',
    key: 'LEVEL_4',
    label: 'Examples Mastered One Way',
    icon: Star,
    description: (sourceLanguage: string, targetLanguage: string) =>
      `Reverse Context (${targetLanguage} ➔ ${sourceLanguage})`,
  },
  {
    id: 'level5',
    key: 'LEVEL_5',
    label: 'Fully Mastered',
    icon: Trophy,
    description: (sourceLanguage: string, targetLanguage: string) =>
      `Fully Mastered (${sourceLanguage} ⟷ ${targetLanguage})`,
  },
] as const;

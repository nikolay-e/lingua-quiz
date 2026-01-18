export const AUDIO = {
  SAMPLE_RATE: 16000,
  CHANNELS: 1,
  FFT_SIZE: 2048,
  TIMESLICE_MS: 100,
} as const;

export const SCORING = {
  DEFAULT_THRESHOLD: 85,
  EXCELLENT_THRESHOLD: 95,
  GOOD_THRESHOLD: 85,
  PHONEME_ERROR_THRESHOLD: 85,
  HIGHLIGHT_THRESHOLD: 80,
  MISPRONUNCIATION_THRESHOLD: 60,
  COLOR_GREEN_THRESHOLD: 90,
  COLOR_YELLOW_THRESHOLD: 70,
} as const;

export const SIMULATION = {
  WORD_SCORE_MIN: 70,
  WORD_SCORE_RANGE: 30,
  PHONEME_SCORE_MIN: 60,
  PHONEME_SCORE_RANGE: 40,
  COMPLETENESS_MIN: 95,
  COMPLETENESS_RANGE: 5,
  PHONEME_ERROR_THRESHOLD: 70,
} as const;

export const AZURE_REGIONS = [
  { value: 'eastus', label: 'East US' },
  { value: 'eastus2', label: 'East US 2' },
  { value: 'westus', label: 'West US' },
  { value: 'westus2', label: 'West US 2' },
  { value: 'westeurope', label: 'West Europe' },
  { value: 'northeurope', label: 'North Europe' },
  { value: 'germanywestcentral', label: 'Germany West Central' },
  { value: 'uksouth', label: 'UK South' },
  { value: 'southeastasia', label: 'Southeast Asia' },
  { value: 'australiaeast', label: 'Australia East' },
] as const;

export const DEFAULT_AZURE_REGION = 'eastus';

export const STORAGE_KEY = 'lingua-quiz-speak';

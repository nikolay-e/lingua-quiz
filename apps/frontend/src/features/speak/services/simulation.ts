import type { PhonemeError, WordAssessment, AssessmentResult } from '../types';
import { SCORING, SIMULATION } from '../lib/constants';

const SIMULATED_PHONEMES = ['θ', 'ð', 'ɹ', 'æ', 'ʊ', 'ŋ', 'ʒ'];

export function generateSimulatedAssessment(referenceText: string): AssessmentResult {
  const words = referenceText.split(' ');
  const wordAssessments: WordAssessment[] = [];
  const phonemeErrors: PhonemeError[] = [];

  const pickDifferentPhoneme = (expected: string): string => {
    if (SIMULATED_PHONEMES.length <= 1) return expected;
    let actual = expected;
    while (actual === expected) {
      const randomPhoneme = SIMULATED_PHONEMES[Math.floor(Math.random() * SIMULATED_PHONEMES.length)];
      actual = randomPhoneme ?? expected;
    }
    return actual;
  };

  for (const word of words) {
    const wordScore = SIMULATION.WORD_SCORE_MIN + Math.random() * SIMULATION.WORD_SCORE_RANGE;
    const phonemes: WordAssessment['phonemes'] = [];

    const phonemeCount = Math.min(word.length, 2 + Math.floor(Math.random() * 4));
    for (let i = 0; i < phonemeCount; i++) {
      const score = SIMULATION.PHONEME_SCORE_MIN + Math.random() * SIMULATION.PHONEME_SCORE_RANGE;
      const randomPhoneme = SIMULATED_PHONEMES[Math.floor(Math.random() * SIMULATED_PHONEMES.length)];
      const expected = randomPhoneme ?? 'ə';
      const isError = score < SIMULATION.PHONEME_ERROR_THRESHOLD;
      const actual = isError ? pickDifferentPhoneme(expected) : undefined;

      phonemes.push({ phoneme: expected, score, expected, actual });

      if (isError && actual !== undefined) {
        phonemeErrors.push({
          phoneme: expected,
          expected,
          actual,
          score,
        });
      }
    }

    wordAssessments.push({
      word,
      accuracyScore: wordScore,
      errorType: wordScore < SCORING.MISPRONUNCIATION_THRESHOLD ? 'Mispronunciation' : 'None',
      phonemes,
    });
  }

  const avgScore = wordAssessments.reduce((sum, w) => sum + w.accuracyScore, 0) / wordAssessments.length;

  return {
    scores: {
      accuracy: avgScore + Math.random() * 10 - 5,
      fluency: SIMULATION.WORD_SCORE_MIN + Math.random() * SIMULATION.WORD_SCORE_RANGE,
      completeness: SIMULATION.COMPLETENESS_MIN + Math.random() * SIMULATION.COMPLETENESS_RANGE,
      prosody: SIMULATION.PHONEME_SCORE_MIN + Math.random() * SIMULATION.PHONEME_SCORE_RANGE,
      pronunciation: avgScore,
    },
    phonemeErrors,
    wordAssessments,
    recognizedText: referenceText,
  };
}

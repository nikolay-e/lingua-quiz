import type { PronunciationScores, WordAssessment, AssessmentFeedback } from '../types';
import { SCORING } from './constants';

export function getAssessmentFeedback(
  scores: PronunciationScores,
  threshold: number,
  wordAssessments?: WordAssessment[],
): AssessmentFeedback {
  const hasWordAssessments = wordAssessments !== null && wordAssessments !== undefined && wordAssessments.length > 0;
  const minWordScore = hasWordAssessments ? Math.min(...wordAssessments.map((w) => w.accuracyScore)) : 100;

  const worstWord = wordAssessments?.find((w) => w.accuracyScore === minWordScore);

  if (scores.pronunciation >= threshold && minWordScore < threshold && worstWord !== null && worstWord !== undefined) {
    return {
      passed: false,
      message: `Word "${worstWord.word}" needs work (${Math.round(minWordScore)}%)`,
      suggestion: 'All words must reach threshold to pass.',
    };
  }

  const passed = scores.pronunciation >= threshold && minWordScore >= threshold;

  if (passed) {
    if (scores.pronunciation >= SCORING.EXCELLENT_THRESHOLD) {
      return { passed: true, message: 'Excellent! Native-like pronunciation.' };
    }
    if (scores.pronunciation >= SCORING.GOOD_THRESHOLD) {
      return { passed: true, message: 'Well done! Very clear pronunciation.' };
    }
    return { passed: true, message: 'Good! Threshold passed.' };
  }

  const lowestScore = Math.min(scores.accuracy, scores.fluency, scores.completeness);

  if (lowestScore === scores.accuracy) {
    return {
      passed: false,
      message: 'Work on accuracy',
      suggestion: 'Pay attention to highlighted phonemes and try to produce exact sounds.',
    };
  }

  if (lowestScore === scores.fluency) {
    return {
      passed: false,
      message: 'Work on fluency',
      suggestion: 'Try to speak more smoothly, without pauses between words.',
    };
  }

  return {
    passed: false,
    message: 'Try again',
    suggestion: 'Make sure to pronounce all words in the phrase.',
  };
}

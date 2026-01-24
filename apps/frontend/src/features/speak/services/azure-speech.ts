import type { PronunciationScores, PhonemeError, WordAssessment, AssessmentResult, LanguageCode } from '../types';
import { AUDIO, SCORING, SIMULATION } from '../lib/constants';

function unicodeToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
  return btoa(binString);
}

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (sharedAudioContext === null || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContext({ sampleRate: AUDIO.SAMPLE_RATE });
  }
  return sharedAudioContext;
}

interface AzurePhonemeDetail {
  Phoneme: string;
  Offset?: number;
  Duration?: number;
  AccuracyScore?: number;
  NBestPhonemes?: Array<{
    Phoneme: string;
    Score: number;
  }>;
  PronunciationAssessment?: {
    AccuracyScore: number;
    NBestPhonemes?: Array<{
      Phoneme: string;
      Score: number;
    }>;
  };
}

interface AzureWordDetail {
  Word: string;
  Offset?: number;
  Duration?: number;
  Confidence?: number;
  AccuracyScore?: number;
  PronunciationAssessment?: {
    AccuracyScore: number;
    ErrorType?: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation';
  };
  Phonemes?: AzurePhonemeDetail[];
}

interface AzurePronunciationResult {
  RecognitionStatus?: string;
  DisplayText?: string;
  NBest: Array<{
    Confidence: number;
    Lexical: string;
    Display: string;
    AccuracyScore: number;
    FluencyScore?: number;
    CompletenessScore?: number;
    ProsodyScore?: number;
    PronScore?: number;
    PronunciationAssessment?: {
      AccuracyScore: number;
      FluencyScore: number;
      CompletenessScore: number;
      ProsodyScore?: number;
      PronScore: number;
    };
    Words: AzureWordDetail[];
  }>;
}

async function blobToWav(blob: Blob): Promise<ArrayBuffer> {
  const audioContext = getAudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

  const numChannels = 1;
  const sampleRate = AUDIO.SAMPLE_RATE;
  const bitsPerSample = 16;
  const numSamples = audioBuffer.length;

  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  const channelData = audioBuffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const rawSample = channelData[i] ?? 0;
    const sample = Math.max(-1, Math.min(1, rawSample));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

export async function assessPronunciation(
  audioBlob: Blob,
  referenceText: string,
  apiKey: string,
  region: string,
  language: LanguageCode,
): Promise<AssessmentResult> {
  const audioBuffer = await blobToWav(audioBlob);

  const pronunciationConfig = {
    referenceText,
    gradingSystem: 'HundredMark',
    granularity: 'Phoneme',
    dimension: 'Comprehensive',
    enableMiscue: true,
    enableProsodyAssessment: true,
    phonemeAlphabet: 'IPA',
    nBestPhonemeCount: 5,
  };

  const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${language}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': `audio/wav; codecs=audio/pcm; samplerate=${AUDIO.SAMPLE_RATE}`,
      'Pronunciation-Assessment': unicodeToBase64(JSON.stringify(pronunciationConfig)),
    },
    body: audioBuffer,
  });

  if (!response.ok) {
    throw new Error(`Azure API error: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as AzurePronunciationResult;

  const nBestArray = result.NBest;
  const nBest = nBestArray[0];
  if (nBest === undefined) {
    throw new Error(`No pronunciation assessment results: ${JSON.stringify(result)}`);
  }

  const words = nBest.Words;

  const scores: PronunciationScores =
    nBest.PronunciationAssessment !== undefined
      ? {
          accuracy: nBest.PronunciationAssessment.AccuracyScore,
          fluency: nBest.PronunciationAssessment.FluencyScore,
          completeness: nBest.PronunciationAssessment.CompletenessScore,
          prosody: nBest.PronunciationAssessment.ProsodyScore ?? 100,
          pronunciation: nBest.PronunciationAssessment.PronScore,
        }
      : {
          accuracy: nBest.AccuracyScore,
          fluency: nBest.FluencyScore ?? nBest.AccuracyScore,
          completeness: nBest.CompletenessScore ?? 100,
          prosody: nBest.ProsodyScore ?? 100,
          pronunciation: nBest.PronScore ?? nBest.AccuracyScore,
        };

  const phonemeErrors: PhonemeError[] = [];
  const wordAssessments: WordAssessment[] = [];

  for (const word of words) {
    const wordPhonemes: WordAssessment['phonemes'] = [];

    if (word.Phonemes !== undefined) {
      for (const phoneme of word.Phonemes) {
        if (phoneme.Phoneme === '') continue;

        const score = phoneme.PronunciationAssessment?.AccuracyScore ?? phoneme.AccuracyScore ?? 0;
        const nBestPhonemes = phoneme.PronunciationAssessment?.NBestPhonemes ?? phoneme.NBestPhonemes;
        const bestMatch = nBestPhonemes?.[0];
        const actual =
          bestMatch !== undefined && bestMatch.Phoneme !== phoneme.Phoneme ? bestMatch.Phoneme : phoneme.Phoneme;

        wordPhonemes.push({
          phoneme: phoneme.Phoneme,
          score,
          expected: phoneme.Phoneme,
          actual: actual !== phoneme.Phoneme ? actual : undefined,
        });

        if (score < SCORING.PHONEME_ERROR_THRESHOLD) {
          phonemeErrors.push({
            phoneme: phoneme.Phoneme,
            expected: phoneme.Phoneme,
            actual,
            score,
          });
        }
      }
    }

    const wordAccuracy = word.PronunciationAssessment?.AccuracyScore ?? word.AccuracyScore ?? 0;
    const wordErrorType = word.PronunciationAssessment?.ErrorType ?? 'None';

    wordAssessments.push({
      word: word.Word,
      accuracyScore: wordAccuracy,
      errorType: wordErrorType,
      phonemes: wordPhonemes,
    });
  }

  return {
    scores,
    phonemeErrors,
    wordAssessments,
    recognizedText: result.DisplayText ?? referenceText,
  };
}

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

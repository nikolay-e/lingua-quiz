import { OpenAPI } from '@lingua-quiz/api-client';
import { blobToWav } from '@features/speak/lib/audio';
import type { AssessmentResult, LanguageCode } from '@features/speak/types';

interface SpeechAssessApiResponse {
  accuracy: number;
  fluency: number;
  completeness: number;
  prosody: number;
  pronunciation: number;
  wordAssessments: Array<{
    word: string;
    accuracyScore: number;
    errorType: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation';
    phonemes: Array<{
      phoneme: string;
      score: number;
      expected: string;
      actual?: string;
    }>;
  }>;
  phonemeErrors: Array<{
    phoneme: string;
    expected: string;
    actual: string;
    score: number;
  }>;
  recognizedText: string;
}

export async function assessPronunciationViaBackend(
  audioBlob: Blob,
  text: string,
  language: LanguageCode,
  token: string,
): Promise<AssessmentResult> {
  const wavBuffer = await blobToWav(audioBlob);
  const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

  const formData = new FormData();
  formData.append('audio', wavBlob, 'recording.wav');

  const params = new URLSearchParams({ text, language });
  const url = `${OpenAPI.BASE}/api/speech/assess?${params.toString()}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    const errorData = (await response.json().catch(() => ({ detail: response.statusText }))) as { detail?: string };
    throw new Error(errorData.detail ?? `Speech assessment failed: ${response.status}`);
  }

  const data = (await response.json()) as SpeechAssessApiResponse;

  return {
    scores: {
      accuracy: data.accuracy,
      fluency: data.fluency,
      completeness: data.completeness,
      prosody: data.prosody,
      pronunciation: data.pronunciation,
    },
    wordAssessments: data.wordAssessments,
    phonemeErrors: data.phonemeErrors,
    recognizedText: data.recognizedText,
  };
}

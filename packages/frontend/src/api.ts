import {
  AuthenticationService,
  ContentVersionService,
  ProgressService,
  TextToSpeechService,
  VocabularyService,
  type TokenResponse,
} from './generated/api';
import type {
  AuthResponse,
  ContentVersion,
  Translation,
  TTSLanguagesResponse,
  TTSResponse,
  UserProgress,
  WordList,
} from './api-types';
import {
  validateContentVersion,
  validateTtsLanguages,
  validateTtsResponse,
  validateUserProgress,
  validateVocabularyItem,
  validateWordList,
} from '@lingua-quiz/domain';
import { handleApiError, setAuthToken } from './apiClientConfig';

const mapAuthResponse = (response: TokenResponse): AuthResponse => ({
  token: response.token,
  refresh_token: response.refresh_token,
  expires_in: response.expires_in ?? '15m',
  user: {
    id: response.user.id,
    username: response.user.username,
    is_admin: response.user.is_admin ?? false,
    isAdmin: response.user.is_admin ?? false,
  },
});

type ValidatorFn = (data: unknown) => { valid: boolean; errors: string[] };

const validateOne = <T>(data: T, validator: ValidatorFn, label: string): T => {
  const result = validator(data);
  if (!result.valid) {
    throw new Error(`Invalid ${label}: ${result.errors.join('; ')}`);
  }
  return data;
};

const validateMany = <T>(data: T[], validator: ValidatorFn, label: string): T[] => {
  data.forEach((item, idx) => validateOne(item, validator, `${label}[${idx}]`));
  return data;
};

const execute = async <T>(operation: () => Promise<T>, token?: string): Promise<T> => {
  if (token !== undefined) {
    setAuthToken(token);
  }
  try {
    return await operation();
  } catch (error) {
    return handleApiError(error);
  }
};

const api = {
  login: async (params: { username: string; password: string }): Promise<AuthResponse> => {
    setAuthToken(undefined);
    return execute(() => AuthenticationService.loginUserApiAuthLoginPost(params).then(mapAuthResponse));
  },

  register: async (params: { username: string; password: string }): Promise<AuthResponse> => {
    setAuthToken(undefined);
    return execute(() => AuthenticationService.registerUserApiAuthRegisterPost(params).then(mapAuthResponse));
  },

  refreshToken: async (params: { refresh_token: string }): Promise<AuthResponse> => {
    setAuthToken(undefined);
    return execute(() => AuthenticationService.refreshAccessTokenApiAuthRefreshPost(params).then(mapAuthResponse));
  },

  fetchWordLists: (token: string): Promise<WordList[]> =>
    execute(
      () =>
        VocabularyService.getWordListsApiWordListsGet().then((data) =>
          validateMany(data, validateWordList, 'wordList'),
        ),
      token,
    ),

  saveProgress: (
    token: string,
    payload: {
      vocabularyItemId: string;
      level: number;
      queuePosition: number;
      correctCount: number;
      incorrectCount: number;
    },
  ): Promise<void> => execute(() => ProgressService.saveUserProgressApiUserProgressPost(payload), token),

  synthesizeSpeech: (token: string, data: { text: string; language: string }): Promise<TTSResponse> =>
    execute(
      () =>
        TextToSpeechService.synthesizeSpeechApiTtsSynthesizePost(data).then((res) =>
          validateOne(res, validateTtsResponse, 'ttsResponse'),
        ),
      token,
    ),

  getTTSLanguages: (token: string): Promise<TTSLanguagesResponse> =>
    execute(
      () =>
        TextToSpeechService.getTtsLanguagesApiTtsLanguagesGet().then((res) =>
          validateOne(res, validateTtsLanguages, 'ttsLanguages'),
        ),
      token,
    ),

  deleteAccount: (token: string): Promise<void> =>
    execute(() => AuthenticationService.deleteAccountApiAuthDeleteAccountDelete(), token),

  fetchTranslations: (token: string, listName: string): Promise<Translation[]> =>
    execute(
      () =>
        VocabularyService.getTranslationsApiTranslationsGet(listName).then((data) =>
          validateMany(data, validateVocabularyItem, 'translation'),
        ),
      token,
    ),

  fetchUserProgress: (token: string, listName?: string): Promise<UserProgress[]> =>
    execute(
      () =>
        ProgressService.getUserProgressApiUserProgressGet(listName ?? null).then((data) =>
          validateMany(data, validateUserProgress, 'userProgress'),
        ),
      token,
    ),

  fetchContentVersion: (token: string): Promise<ContentVersion> =>
    execute(
      () =>
        ContentVersionService.getActiveContentVersionApiContentVersionGet().then((res) =>
          validateOne(res, validateContentVersion, 'contentVersion'),
        ),
      token,
    ),
};

export default api;

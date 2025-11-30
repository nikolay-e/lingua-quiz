import { authStore, setQuizStoreRef } from './authStore';
import { quizStore } from './quizStore';
import { themeStore } from './themeStore';
import { levelWordLists } from './derivedStores';
import { quizService } from '../lib/services/QuizService';
import { safeStorage } from '../lib/utils/safeStorage';

setQuizStoreRef((token: string) => quizStore.saveAndCleanup(token));

quizService.setLogoutCallback(() => authStore.logoutUser());

export { authStore, quizStore, themeStore, levelWordLists, safeStorage };

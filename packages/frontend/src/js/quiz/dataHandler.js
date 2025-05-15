import { createApp } from '../app.js';
import { config } from '../config.js';
import { AuthUtils } from '../utils/authUtils.js';
import { errorHandler } from '../utils/errorHandler.js';

export async function fetchWordSets(token, wordListName) {
  try {
    if (!AuthUtils.isValidToken(token)) {
      AuthUtils.redirectToLogin();
      return null;
    }

    const wordSetsUrl = `${config.getUrl('userWordSets')}?wordListName=${encodeURIComponent(wordListName)}`;
    const response = await fetch(wordSetsUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        AuthUtils.clearAuth();
        AuthUtils.redirectToLogin();
        return null;
      }
      throw new Error('Failed to fetch word sets');
    }

    const data = await response.json();
    return createApp(data);
  } catch (error) {
    console.error('Error fetching word sets:', error);
    errorHandler.handleApiError(error);
    throw error;
  }
}

export async function fetchWordLists(token) {
  try {
    if (!AuthUtils.isValidToken(token)) {
      AuthUtils.redirectToLogin();
      return null;
    }

    const response = await fetch(config.getUrl('wordLists'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        AuthUtils.clearAuth();
        AuthUtils.redirectToLogin();
        return null;
      }
      throw new Error('Failed to fetch word lists');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching word lists:', error);
    errorHandler.handleApiError(error);
    throw error;
  }
}

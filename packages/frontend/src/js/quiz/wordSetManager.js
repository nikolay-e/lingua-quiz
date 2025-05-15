import { STATUS } from '../app.js';
import { config } from '../config.js';

async function saveQuizState(app, token) {
  const statusSets = {
    [STATUS.LEVEL_3]: app.wordStatusSets[STATUS.LEVEL_3],
    [STATUS.LEVEL_2]: app.wordStatusSets[STATUS.LEVEL_2],
    [STATUS.LEVEL_1]: app.wordStatusSets[STATUS.LEVEL_1],
    [STATUS.LEVEL_0]: app.wordStatusSets[STATUS.LEVEL_0],
  };

  try {
    const promises = Object.entries(statusSets).map(([status, set]) => {
      const wordPairIds = Array.from(set);

      return fetch(config.getUrl('userWordSets'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          wordPairIds,
        }),
      }).then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to save quiz state for ${status}`);
        }
      });
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Error saving quiz state:', error);
    throw error;
  }
}

export { saveQuizState };

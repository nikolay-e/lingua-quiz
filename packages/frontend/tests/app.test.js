import { App, createApp, STATUS, DIRECTION } from '../src/js/app.js';
import { errorHandler } from '../src/js/utils/errorHandler.js';

jest.mock('../src/js/utils/errorHandler.js', () => ({
  errorHandler: {
    handleApiError: jest.fn(),
  },
}));

describe('App Class', () => {
  let app;
  const mockData = [
    {
      wordPairId: 1,
      sourceWord: 'hello',
      targetWord: 'hola',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Upcoming Words',
      sourceWordUsageExample: 'Hello, how are you?',
      targetWordUsageExample: '¿Hola, cómo estás?',
    },
    {
      wordPairId: 2,
      sourceWord: 'goodbye',
      targetWord: 'adiós',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Focus Words',
      sourceWordUsageExample: 'Goodbye, see you later!',
      targetWordUsageExample: '¡Adiós, hasta luego!',
    },
    {
      wordPairId: 3,
      sourceWord: 'please',
      targetWord: 'por favor',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Mastered One Direction',
      sourceWordUsageExample: 'Please, help me.',
      targetWordUsageExample: 'Por favor, ayúdame.',
    },
    {
      wordPairId: 4,
      sourceWord: 'thank you',
      targetWord: 'gracias',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Mastered Vocabulary',
      sourceWordUsageExample: 'Thank you for your help.',
      targetWordUsageExample: 'Gracias por tu ayuda.',
    },
    {
      wordPairId: 5,
      sourceWord: 'yes',
      targetWord: 'sí',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Upcoming Words',
      sourceWordUsageExample: 'Yes, I agree.',
      targetWordUsageExample: 'Sí, estoy de acuerdo.',
    },
    {
      wordPairId: 6,
      sourceWord: 'no',
      targetWord: 'no',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Focus Words',
      sourceWordUsageExample: "No, I don't want to.",
      targetWordUsageExample: 'No, no quiero.',
    },
    {
      wordPairId: 7,
      sourceWord: 'water',
      targetWord: 'agua',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Upcoming Words',
      sourceWordUsageExample: 'I need some water.',
      targetWordUsageExample: 'Necesito un poco de agua.',
    },
    {
      wordPairId: 8,
      sourceWord: 'food',
      targetWord: 'comida',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Focus Words',
      sourceWordUsageExample: 'The food is delicious.',
      targetWordUsageExample: 'La comida está deliciosa.',
    },
    {
      wordPairId: 9,
      sourceWord: 'house',
      targetWord: 'casa',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Mastered One Direction',
      sourceWordUsageExample: 'My house is big.',
      targetWordUsageExample: 'Mi casa es grande.',
    },
    {
      wordPairId: 10,
      sourceWord: 'car',
      targetWord: 'coche',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Mastered Vocabulary',
      sourceWordUsageExample: 'I drive a red car.',
      targetWordUsageExample: 'Conduzco un coche rojo.',
    },
    {
      wordPairId: 11,
      sourceWord: 'book',
      targetWord: 'libro',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Upcoming Words',
      sourceWordUsageExample: 'I love this book.',
      targetWordUsageExample: 'Me encanta este libro.',
    },
    {
      wordPairId: 12,
      sourceWord: 'friend',
      targetWord: 'amigo',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Focus Words',
      sourceWordUsageExample: 'She is my friend.',
      targetWordUsageExample: 'Ella es mi amiga.',
    },
    {
      wordPairId: 13,
      sourceWord: 'family',
      targetWord: 'familia',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Mastered One Direction',
      sourceWordUsageExample: 'My family is large.',
      targetWordUsageExample: 'Mi familia es grande.',
    },
    {
      wordPairId: 14,
      sourceWord: 'love',
      targetWord: 'amor',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Mastered Vocabulary',
      sourceWordUsageExample: 'Love is important.',
      targetWordUsageExample: 'El amor es importante.',
    },
    {
      wordPairId: 15,
      sourceWord: 'time',
      targetWord: 'tiempo',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Upcoming Words',
      sourceWordUsageExample: 'What time is it?',
      targetWordUsageExample: '¿Qué hora es?',
    },
    {
      wordPairId: 16,
      sourceWord: 'day',
      targetWord: 'día',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Focus Words',
      sourceWordUsageExample: 'Have a nice day!',
      targetWordUsageExample: '¡Que tengas un buen día!',
    },
    {
      wordPairId: 17,
      sourceWord: 'night',
      targetWord: 'noche',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Upcoming Words',
      sourceWordUsageExample: 'Good night, sleep well.',
      targetWordUsageExample: 'Buenas noches, que duermas bien.',
    },
    {
      wordPairId: 18,
      sourceWord: 'eat',
      targetWord: 'comer',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Mastered One Direction',
      sourceWordUsageExample: 'I like to eat pizza.',
      targetWordUsageExample: 'Me gusta comer pizza.',
    },
    {
      wordPairId: 19,
      sourceWord: 'drink',
      targetWord: 'beber',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Focus Words',
      sourceWordUsageExample: 'What would you like to drink?',
      targetWordUsageExample: '¿Qué te gustaría beber?',
    },
    {
      wordPairId: 20,
      sourceWord: 'work',
      targetWord: 'trabajo',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Mastered Vocabulary',
      sourceWordUsageExample: 'I have to go to work.',
      targetWordUsageExample: 'Tengo que ir al trabajo.',
    },
    {
      wordPairId: 21,
      sourceWord: 'play',
      targetWord: 'jugar',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Upcoming Words',
      sourceWordUsageExample: 'The children like to play in the park.',
      targetWordUsageExample: 'A los niños les gusta jugar en el parque.',
    },
    {
      wordPairId: 22,
      sourceWord: 'school',
      targetWord: 'escuela',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Focus Words',
      sourceWordUsageExample: 'The school is closed today.',
      targetWordUsageExample: 'La escuela está cerrada hoy.',
    },
    {
      wordPairId: 23,
      sourceWord: 'money',
      targetWord: 'dinero',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Mastered One Direction',
      sourceWordUsageExample: 'I need to save money.',
      targetWordUsageExample: 'Necesito ahorrar dinero.',
    },
    {
      wordPairId: 24,
      sourceWord: 'sun',
      targetWord: 'sol',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Upcoming Words',
      sourceWordUsageExample: 'The sun is shining brightly.',
      targetWordUsageExample: 'El sol brilla intensamente.',
    },
    {
      wordPairId: 25,
      sourceWord: 'moon',
      targetWord: 'luna',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Mastered Vocabulary',
      sourceWordUsageExample: 'The moon is full tonight.',
      targetWordUsageExample: 'La luna está llena esta noche.',
    },
    {
      wordPairId: 26,
      sourceWord: 'happy',
      targetWord: 'feliz',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Focus Words',
      sourceWordUsageExample: 'I am happy to see you.',
      targetWordUsageExample: 'Estoy feliz de verte.',
    },
    {
      wordPairId: 27,
      sourceWord: 'sad',
      targetWord: 'triste',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Upcoming Words',
      sourceWordUsageExample: 'Why are you sad?',
      targetWordUsageExample: '¿Por qué estás triste?',
    },
    {
      wordPairId: 28,
      sourceWord: 'big',
      targetWord: 'grande',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Mastered One Direction',
      sourceWordUsageExample: 'That is a big dog!',
      targetWordUsageExample: '¡Ese es un perro grande!',
    },
    {
      wordPairId: 29,
      sourceWord: 'small',
      targetWord: 'pequeño',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Focus Words',
      sourceWordUsageExample: 'The mouse is very small.',
      targetWordUsageExample: 'El ratón es muy pequeño.',
    },
    {
      wordPairId: 30,
      sourceWord: 'good',
      targetWord: 'bueno',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      status: 'Mastered Vocabulary',
      sourceWordUsageExample: 'This is a good restaurant.',
      targetWordUsageExample: 'Este es un buen restaurante.',
    },
  ];

  beforeEach(() => {
    app = new App(mockData);
  });

  describe('Initialization', () => {
    it('should initialize with provided data', () => {
      expect(app.quizTranslations.size).toBe(mockData.length);
      expect(app.sourceLanguage).toBe('en');
      expect(app.targetLanguage).toBe('es');
    });

    it('should throw an error with invalid data', () => {
      expect(() => new App([])).toThrow('Invalid or insufficient data provided.');
    });

    it('should throw an error when no valid entries are added to quizTranslations', () => {
      const invalidData = [{ invalidEntry: true }, { anotherInvalidEntry: 'test' }];
      expect(() => new App(invalidData)).toThrow('No valid entries added to quizTranslations');
    });

    it('should populate focus words on initialization', () => {
      expect(app.wordStatusSets[STATUS.FOCUS].size).toBeGreaterThan(0);
    });
  });

  describe('Word Management', () => {
    it('should move a word to a new status', () => {
      const wordId = Array.from(app.wordStatusSets[STATUS.UPCOMING])[0];
      app.moveWordToStatus(wordId, STATUS.FOCUS);
      expect(app.wordStatusSets[STATUS.FOCUS].has(wordId)).toBe(true);
      expect(app.wordStatusSets[STATUS.UPCOMING].has(wordId)).toBe(false);
    });

    it('should default to "Upcoming Words" when moving a word to an unknown status', () => {
      const wordId = 1;
      app.moveWordToStatus(wordId, 'Unknown Status');
      expect(app.wordStatusSets[STATUS.UPCOMING].has(wordId)).toBe(true);
      expect(app.wordStatusSets['Unknown Status']).toBeUndefined();
    });

    it('should populate focus words when needed and available', () => {
      app.wordStatusSets[STATUS.FOCUS].clear();
      const initialUpcomingSize = app.wordStatusSets[STATUS.UPCOMING].size;
      app.populateFocusWords();
      expect(app.wordStatusSets[STATUS.FOCUS].size).toBe(Math.min(20, initialUpcomingSize));
      expect(app.wordStatusSets[STATUS.UPCOMING].size).toBe(Math.max(0, initialUpcomingSize - 20));
    });

    it('should not populate focus words when focus set is already full', () => {
      // Fill focusSet to have 20 items
      app.wordStatusSets[STATUS.FOCUS].clear();
      for (let i = 100; i < 120; i++) {
        app.wordStatusSets[STATUS.FOCUS].add(i);
      }
      const initialUpcomingSize = app.wordStatusSets[STATUS.UPCOMING].size;
      app.populateFocusWords();
      // Verify that focusSet size remains 20 and upcomingSet size remains the same
      expect(app.wordStatusSets[STATUS.FOCUS].size).toBe(20);
      expect(app.wordStatusSets[STATUS.UPCOMING].size).toBe(initialUpcomingSize);
    });

    it('should not populate focus words when no upcoming words are available', () => {
      app.wordStatusSets[STATUS.FOCUS].clear();
      app.wordStatusSets[STATUS.UPCOMING].clear();
      app.populateFocusWords();
      expect(app.wordStatusSets[STATUS.FOCUS].size).toBe(0);
    });
  });

  describe('Quiz Direction', () => {
    it('should toggle direction when mastered words exist', () => {
      app.wordStatusSets[STATUS.MASTERED_ONE_DIRECTION].add(1);
      const newDirection = app.toggleDirection();
      expect(newDirection).toBe('Reverse');
      expect(app.direction).toBe(DIRECTION.REVERSE);
    });

    it('should not toggle direction when no mastered words', () => {
      app.wordStatusSets[STATUS.MASTERED_ONE_DIRECTION].clear();
      const newDirection = app.toggleDirection();
      expect(newDirection).toBe('Normal');
      expect(app.direction).toBe(DIRECTION.NORMAL);
    });
  });

  describe('Question Selection', () => {
    it('should get the next question', () => {
      const question = app.getNextQuestion();
      expect(question).toHaveProperty('word');
      expect(question).toHaveProperty('translationId');
    });

    it('should update last asked words', () => {
      app.getNextQuestion();
      expect(app.lastAskedWords.length).toBe(1);
    });

    it('should return null when no words are available', () => {
      app.wordStatusSets[STATUS.FOCUS].clear();
      app.wordStatusSets[STATUS.MASTERED_ONE_DIRECTION].clear();
      const question = app.getNextQuestion();
      expect(question).toBeNull();
    });

    it('should return null in getNextQuestion when current set is empty', () => {
      // Clear the current set based on direction
      app.direction = DIRECTION.NORMAL;
      app.wordStatusSets[STATUS.FOCUS].clear();
      const question = app.getNextQuestion();
      expect(question).toBeNull();

      app.direction = DIRECTION.REVERSE;
      app.wordStatusSets[STATUS.MASTERED_ONE_DIRECTION].clear();
      const questionReverse = app.getNextQuestion();
      expect(questionReverse).toBeNull();
    });
  });

  describe('Answer Submission', () => {
    it('should correctly verify a correct answer', async () => {
      app.currentTranslationId = 1;
      const result = await app.submitAnswer('hola', false);
      expect(result.feedback.isSuccess).toBe(true);
    });

    it('should correctly verify an incorrect answer', async () => {
      app.currentTranslationId = 1;
      const result = await app.submitAnswer('adios', false);
      expect(result.feedback.isSuccess).toBe(false);
    });

    it('should update stats on answer submission', async () => {
      app.currentTranslationId = 1;
      await app.submitAnswer('hola', false);
      expect(app.stats.totalAttempts).toBe(1);
      expect(app.stats.correctAnswers).toBe(1);
    });

    it('should move word to mastered one direction after 3 correct answers', async () => {
      app.currentTranslationId = 1;
      app.moveWordToStatus(1, STATUS.FOCUS);
      for (let i = 0; i < 3; i++) {
        await app.submitAnswer('hola', false);
      }
      expect(app.wordStatusSets[STATUS.MASTERED_ONE_DIRECTION].has(1)).toBe(true);
    });

    it('should move word to mastered vocabulary after mastering both directions', async () => {
      // Master normal direction
      app.currentTranslationId = 1;
      app.moveWordToStatus(1, STATUS.FOCUS);
      for (let i = 0; i < 3; i++) {
        await app.submitAnswer('hola', false);
      }

      // Master reverse direction
      app.direction = DIRECTION.REVERSE;
      app.currentTranslationId = 1;
      for (let i = 0; i < 3; i++) {
        await app.submitAnswer('hello', false);
      }

      expect(app.wordStatusSets[STATUS.MASTERED_VOCABULARY].has(1)).toBe(true);
    });

    it('should not move word to mastered one direction if answers are incorrect', async () => {
      app.currentTranslationId = 1;
      app.moveWordToStatus(1, STATUS.FOCUS);
      for (let i = 0; i < 3; i++) {
        await app.submitAnswer('wrong answer', false);
      }
      expect(app.wordStatusSets[STATUS.MASTERED_ONE_DIRECTION].has(1)).toBe(false);
    });

    it('should provide usage examples in the response', async () => {
      app.currentTranslationId = 1;
      const result = await app.submitAnswer('hola', false);
      expect(result.usageExamples.source).toBe('Hello, how are you?');
      expect(result.usageExamples.target).toBe('¿Hola, cómo estás?');
    });

    it('should handle empty user answers gracefully', async () => {
      app.currentTranslationId = 1;
      const result = await app.submitAnswer('', false);
      expect(result.feedback.isSuccess).toBe(false);
      expect(result.feedback.message).toContain('Wrong');
    });

    it('should handle undefined or null userAnswer in compareAnswers', () => {
      app.currentTranslationId = 1;
      const resultUndefined = app.compareAnswers(undefined, 'hola');
      expect(resultUndefined).toBe(false);

      const resultNull = app.compareAnswers(null, 'hola');
      expect(resultNull).toBe(false);
    });

    it('should handle undefined or null correctAnswer in compareAnswers', () => {
      const resultUndefined = app.compareAnswers('hola', undefined);
      expect(resultUndefined).toBe(false);

      const resultNull = app.compareAnswers('hola', null);
      expect(resultNull).toBe(false);
    });

    it('should get next question when shouldGetNextQuestion is true', async () => {
      app.currentTranslationId = 1;
      const result = await app.submitAnswer('hola', true);
      expect(result.questionData).not.toBeNull();
      expect(result.questionData).toHaveProperty('word');
    });
  });

  describe('Statistics Tracking', () => {
    it('should aggregate incorrect counts correctly', () => {
      app.stats.incorrectPerTranslationIdAndDirection = {
        '1-normal': 2,
        '1-reverse': 1,
        '2-normal': 3,
      };
      const counts = app.aggregateIncorrectCounts();
      expect(counts).toEqual({ 1: 3, 2: 3 });
    });
  });

  describe('Error Handling', () => {
    it('should handle submitting answer for non-existent word', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      app.currentTranslationId = 999; // Non-existent ID
      const result = await app.submitAnswer('test', false);
      expect(result.feedback.isSuccess).toBe(false);
      expect(result.feedback.message).toContain('An error occurred');
      consoleErrorSpy.mockRestore();
    });

    it('should handle error when creating App instance in createApp', () => {
      const invalidData = null;
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => createApp(invalidData)).toThrow();
      expect(errorHandler.handleApiError).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle getting next question when all words are mastered', () => {
      // Move all words to Mastered Vocabulary
      app.quizTranslations.forEach((_, id) => {
        app.moveWordToStatus(id, STATUS.MASTERED_VOCABULARY);
      });
      const question = app.getNextQuestion();
      expect(question).toBeNull();
    });

    it('should handle case insensitive and trimmed answers', async () => {
      app.currentTranslationId = 1;
      const result = await app.submitAnswer('  HoLa  ', false);
      expect(result.feedback.isSuccess).toBe(true);
    });
  });
});

import type { LanguageCode } from '../types';

export const PRACTICE_PHRASES: Record<LanguageCode, string[]> = {
  'en-US': [
    'Hello, how are you today?',
    'The weather is beautiful this morning.',
    'I would like a cup of coffee, please.',
    'What time does the train leave?',
    'Could you help me find the library?',
    'I am learning to speak English fluently.',
    'Thank you very much for your help.',
    'Where is the nearest bus stop?',
    'I enjoy reading books in my free time.',
    'Have a wonderful day!',
  ],
  'fr-FR': [
    'Bonjour, comment allez-vous?',
    "Je voudrais un café, s'il vous plaît.",
    'Où se trouve la gare?',
    "Il fait beau aujourd'hui.",
    'Merci beaucoup pour votre aide.',
    "Je suis en train d'apprendre le français.",
    "Pourriez-vous répéter, s'il vous plaît?",
    "J'aime beaucoup la cuisine française.",
    'À quelle heure ouvre le musée?',
    'Passez une excellente journée!',
  ],
  'de-DE': [
    'Guten Tag, wie geht es Ihnen?',
    'Ich möchte einen Kaffee, bitte.',
    'Wo ist der Bahnhof?',
    'Das Wetter ist heute sehr schön.',
    'Vielen Dank für Ihre Hilfe.',
    'Ich lerne gerade Deutsch.',
    'Könnten Sie das bitte wiederholen?',
    'Ich mag die deutsche Kultur sehr.',
    'Um wie viel Uhr öffnet das Museum?',
    'Ich wünsche Ihnen einen schönen Tag!',
  ],
  'es-ES': [
    'Hola, ¿cómo estás?',
    'Me gustaría un café, por favor.',
    '¿Dónde está la estación de tren?',
    'Hace muy buen tiempo hoy.',
    'Muchas gracias por su ayuda.',
    'Estoy aprendiendo a hablar español.',
    '¿Podría repetir eso, por favor?',
    'Me encanta la comida española.',
    '¿A qué hora abre el museo?',
    '¡Que tengas un buen día!',
  ],
};

export function getRandomPhrase(language: LanguageCode, vocabularyExamples?: string[]): string {
  const hasExamples = vocabularyExamples !== undefined && vocabularyExamples.length > 0;
  const pool = hasExamples ? vocabularyExamples : PRACTICE_PHRASES[language];
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex] ?? pool[0] ?? '';
}

export function getDefaultPhrase(language: LanguageCode, vocabularyExamples?: string[]): string {
  if (vocabularyExamples !== undefined && vocabularyExamples.length > 0) {
    return vocabularyExamples[Math.floor(Math.random() * vocabularyExamples.length)] ?? '';
  }
  return PRACTICE_PHRASES[language][0] ?? '';
}

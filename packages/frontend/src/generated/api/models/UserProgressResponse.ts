/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UserProgressResponse = {
  vocabularyItemId: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  level: number;
  queuePosition: number;
  correctCount: number;
  incorrectCount: number;
  consecutiveCorrect: number;
  lastPracticed: string | null;
};

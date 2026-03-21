export interface EditForm {
  sourceText: string;
  targetText: string;
  sourceUsageExample: string | null;
  targetUsageExample: string | null;
  listName: string;
  difficultyLevel?: string;
}

export interface CreateForm {
  sourceText: string;
  targetText: string;
  sourceLanguage: string;
  targetLanguage: string;
  listName: string;
  difficultyLevel?: string;
  sourceUsageExample: string | null;
  targetUsageExample: string | null;
}

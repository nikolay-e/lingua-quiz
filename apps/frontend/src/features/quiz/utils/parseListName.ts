import type { WordList } from '@api/types';

export interface ParsedList {
  source: string;
  target: string;
  level: string;
  listName: string;
  wordCount: number;
}

export function parseListName(list: WordList): ParsedList | null {
  const spaceMatch = list.listName.match(/^(\w+)\s+(\w+)\s+([A-Ca-c]\d)$/);
  const hyphenMatch = list.listName.match(/^(\w+)-(\w+)-([A-Ca-c]\d)$/);
  const match = spaceMatch ?? hyphenMatch;
  if (match?.[1] === undefined || match[2] === undefined || match[3] === undefined) return null;
  return {
    source: match[1].toLowerCase(),
    target: match[2].toLowerCase(),
    level: match[3].toLowerCase(),
    listName: list.listName,
    wordCount: list.wordCount,
  };
}

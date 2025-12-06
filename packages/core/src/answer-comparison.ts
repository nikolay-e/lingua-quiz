const latinToCyrillic: Record<string, string> = {
  a: 'а',
  A: 'А',
  c: 'с',
  C: 'С',
  e: 'е',
  E: 'Е',
  o: 'о',
  O: 'О',
  p: 'р',
  P: 'Р',
  x: 'х',
  X: 'Х',
  y: 'у',
  Y: 'У',
};

const stripLatinDiacritics = (s: string): string => {
  return s.replace(/[àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ]/g, (char) => {
    return char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  });
};

const collapseGerman = (s: string): string => {
  return s
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/Ä/g, 'a')
    .replace(/Ö/g, 'o')
    .replace(/Ü/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u');
};

export const normalizeForComparison = (text: string): string => {
  if (text === '') return '';
  let result = text;

  result = result.trim().toLowerCase().replace(/\s+/g, '');
  result = collapseGerman(stripLatinDiacritics(result));

  const containsCyr = /[а-яё]/i.test(result);

  if (containsCyr) {
    result = result.replace(/[aAcCeEoOpPxXyY]/g, (ch) => latinToCyrillic[ch] ?? ch);
  }

  const onlyLookalikes = /^[aAcCeEoOpPxXyY]+$/i.test(result);
  if (onlyLookalikes && result.length <= 3) {
    const strongRussianPattern = result.includes('py') || result.includes('op') || result.includes('po');
    if (strongRussianPattern) {
      result = result.replace(/[aAcCeEoOpPxXyY]/g, (ch) => latinToCyrillic[ch] ?? ch);
    }
  }

  result = result.replace(/ё/g, 'е');

  return result;
};

export const normalize = (text: string): string => normalizeForComparison(text);

const PIPE_SENTINEL = '§§PIPE§§';

export const formatForDisplay = (input: string): string => {
  if (input === '') return input;
  let text = input;

  text = text.replace(/\(([^)]+)\)/g, (match, inner: unknown) => {
    const innerStr = String(inner);
    if (!innerStr.includes('|')) return match;
    const firstAlt =
      innerStr
        .split('|')
        .map((s: string) => s.trim())
        .find((s: string) => s !== '') ?? '';
    return firstAlt;
  });

  while (/\(\s*\)/.test(text)) text = text.replace(/\(\s*\)/g, '');

  text = text.replace(/\[[^\]]*\]/g, (br) => br.replace(/\|/g, PIPE_SENTINEL));

  if (text.includes('|')) {
    text = (text.split('|')[0] ?? '').trim();
  }

  text = text
    .replace(new RegExp(PIPE_SENTINEL, 'g'), '|')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^,+\s*/, '')
    .replace(/\s*,+$/, '')
    .replace(/,+\s*,+/g, ', ')
    .replace(/^,\s*|,\s*$/g, '')
    .trim();

  return text;
};

type AltSet = Set<string>;

const splitTopLevelCommas = (s: string): string[] => {
  const parts: string[] = [];
  let current = '';
  let depthPar = 0;
  let depthBr = 0;
  for (const ch of s) {
    if (ch === '(') depthPar++;
    else if (ch === ')') depthPar = Math.max(0, depthPar - 1);
    else if (ch === '[') depthBr++;
    else if (ch === ']') depthBr = Math.max(0, depthBr - 1);

    if (ch === ',' && depthPar === 0 && depthBr === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim() !== '') parts.push(current.trim());
  return parts;
};

const expandGroup = (group: string): string[] => {
  let g = group.trim();

  if (g.startsWith('(') && g.endsWith(')') && g.includes('|')) {
    g = g.slice(1, -1);
  }

  const bracketMatch = g.match(/^(.*?)(\[(.*?)\])(.*)$/);
  let baseVariants: string[] = [];
  if (bracketMatch !== null) {
    const pre = bracketMatch[1] ?? '';
    const opt = bracketMatch[3] ?? '';
    const post = bracketMatch[4] ?? '';
    baseVariants.push(`${pre}${opt}${post}`);
    baseVariants.push(`${pre}${post}`);
  } else {
    baseVariants = [g];
  }

  const alts: string[] = [];
  baseVariants.forEach((b) => {
    if (b.includes('|')) {
      b.split('|').forEach((p) => {
        const t = p.trim();
        if (t !== '') alts.push(t);
      });
    } else if (b !== '') {
      alts.push(b);
    }
  });

  return Array.from(new Set(alts));
};

const buildGroups = (correct: string): AltSet[] => {
  const groups = splitTopLevelCommas(correct);
  return groups.map((g) => {
    const set: AltSet = new Set(expandGroup(g).map((n: string) => normalize(n)));
    return set;
  });
};

export const checkAnswer = (userAnswer: string, correctAnswer: string): boolean => {
  if (normalize(userAnswer) === '' && normalize(correctAnswer) === '') return true;

  const correctGroups = buildGroups(correctAnswer);

  if (correctGroups.length === 1) {
    const firstGroup = correctGroups[0];
    if (firstGroup === undefined) return false;
    return firstGroup.has(normalize(userAnswer));
  }

  const userTokens = splitTopLevelCommas(userAnswer).map((t: string) => normalize(t));
  if (userTokens.length !== correctGroups.length) return false;

  const used = new Set<number>();
  for (const token of userTokens) {
    let matched = false;
    for (let i = 0; i < correctGroups.length; i++) {
      if (used.has(i)) continue;
      const group = correctGroups[i];
      if (group === undefined) continue;
      if (group.has(token)) {
        used.add(i);
        matched = true;
        break;
      }
    }
    if (!matched) return false;
  }
  return true;
};

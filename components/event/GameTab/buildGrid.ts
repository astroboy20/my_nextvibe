import type { GridData, HiddenWord } from './types';

// ── Build a word-search grid from a list of question objects ─────────────────
// Supports two API shapes:
//  - Wrapper: { grid, hiddenWords, points } (single element with a pre-built grid)
//  - Flat:    [{ word, startCell, endCell, direction, text }, ...]
//  - Auto:    [{ text, correctAnswer, timeLimitSecs }, ...] — we place words ourselves

export function buildGridFromQuestions(questions: any[]): GridData {
  const timeLimitSecs = questions.reduce((acc: number, q: any) => {
    return q.timeLimitSecs && q.timeLimitSecs > 0 ? Math.max(acc, q.timeLimitSecs) : acc;
  }, 60);

  // Unwrap backend wrapper format
  const wrapper =
    questions.length === 1 &&
    Array.isArray(questions[0]?.grid) &&
    Array.isArray(questions[0]?.hiddenWords)
      ? questions[0]
      : null;
  const flatEntries: any[] = wrapper ? wrapper.hiddenWords : questions;

  const extractWord = (q: any): string =>
    ((q.word ?? q.correctAnswer ?? q.text ?? '') as string)
      .toUpperCase()
      .replace(/\s+/g, '');

  const seenWords = new Set<string>();
  const rawWords: { word: string; clue: string; q: any }[] = flatEntries
    .map((q) => ({
      word: extractWord(q),
      clue: q.text ?? q.clue ?? q.word ?? q.correctAnswer ?? '',
      q,
    }))
    .filter(({ word }) => {
      if (!word) return false;
      if (seenWords.has(word)) return false;
      seenWords.add(word);
      return true;
    });

  // ── Pre-built grid from backend ───────────────────────────────────────────
  if (wrapper) {
    const hiddenWords: HiddenWord[] = rawWords
      .filter(({ q }) => q.startCell && q.endCell)
      .map(({ word, clue, q }) => ({
        word,
        clue,
        startCell: [q.startCell[0], q.startCell[1]] as [number, number],
        endCell:   [q.endCell[0],   q.endCell[1]]   as [number, number],
        direction: q.direction ?? 'HORIZONTAL',
      }));
    return { grid: wrapper.grid as string[][], hiddenWords, timeLimitSecs };
  }

  // ── Flat with coordinates ─────────────────────────────────────────────────
  const hasCoords = rawWords.every(({ q }) => q.startCell && q.endCell);
  if (hasCoords) {
    let maxRow = 0, maxCol = 0;
    const hiddenWords: HiddenWord[] = rawWords.map(({ word, clue, q }) => {
      const start: [number, number] = [q.startCell[0], q.startCell[1]];
      const end:   [number, number] = [q.endCell[0],   q.endCell[1]];
      maxRow = Math.max(maxRow, start[0], end[0]);
      maxCol = Math.max(maxCol, start[1], end[1]);
      return { word, clue, startCell: start, endCell: end, direction: q.direction ?? 'HORIZONTAL' };
    });
    const rows = maxRow + 1, cols = maxCol + 1;
    const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill(''));
    for (const hw of hiddenWords) {
      const [r1, c1] = hw.startCell, [r2, c2] = hw.endCell;
      const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
      let r = r1, c = c1;
      for (let i = 0; i < hw.word.length; i++) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = hw.word[i];
        if (r === r2 && c === c2) break;
        r += dr; c += dc;
      }
    }
    fillRandom(grid, rows, cols);
    return { grid, hiddenWords, timeLimitSecs };
  }

  // ── Auto-place ────────────────────────────────────────────────────────────
  const longestWord = rawWords.reduce((m, { word }) => Math.max(m, word.length), 0);
  const SIZE = Math.max(
    longestWord + 2,
    Math.ceil(Math.sqrt(rawWords.length * longestWord * 2.5)) + 2,
    8
  );
  const grid: string[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
  const hiddenWords: HiddenWord[] = [];

  const DIRS = [
    { dr: 0, dc: 1, name: 'HORIZONTAL' },
    { dr: 1, dc: 0, name: 'VERTICAL'   },
  ];

  const canPlace = (word: string, r: number, c: number, dr: number, dc: number): boolean => {
    for (let i = 0; i < word.length; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) return false;
      if (grid[nr][nc] !== '' && grid[nr][nc] !== word[i]) return false;
    }
    return true;
  };

  const shuffle = <T,>(arr: T[]): T[] => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  for (const { word, clue } of rawWords) {
    let placed = false;
    for (const { dr, dc, name } of shuffle(DIRS)) {
      const positions = shuffle(
        Array.from({ length: SIZE * SIZE }, (_, idx) => [
          Math.floor(idx / SIZE), idx % SIZE,
        ] as [number, number])
      );
      for (const [r, c] of positions) {
        if (canPlace(word, r, c, dr, dc)) {
          for (let i = 0; i < word.length; i++) {
            grid[r + dr * i][c + dc * i] = word[i];
          }
          hiddenWords.push({
            word,
            clue,
            startCell: [r, c],
            endCell:   [r + dr * (word.length - 1), c + dc * (word.length - 1)],
            direction: name,
          });
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
  }

  fillRandom(grid, SIZE, SIZE);
  return { grid, hiddenWords, timeLimitSecs };
}

function fillRandom(grid: string[][], rows: number, cols: number) {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (!grid[r][c]) grid[r][c] = alpha[Math.floor(Math.random() * alpha.length)];
}

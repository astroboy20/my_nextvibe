// ── Shared types for the GameTab feature ──────────────────────────────────────

export type GameType =
  | 'trivia'
  | 'word-puzzle'
  | 'two-truths'
  | 'this-or-that'
  | 'feedback';

export type GameStatus = 'pending' | 'live' | 'ended';

export type PhaseTab =
  | 'pre-event'
  | 'main-event'
  | 'post-event'
  | 'both';

export interface HiddenWord {
  word:      string;
  clue:      string;
  startCell: [number, number];
  endCell:   [number, number];
  direction: string;
}

export type CellState = 'idle' | 'hovered' | 'correct' | 'wrong';

// ── Mapping helpers ───────────────────────────────────────────────────────────

export function mapType(t: string): GameType {
  return (({
    TRIVIA:              'trivia',
    WORD_PUZZLE:         'word-puzzle',
    TWO_TRUTHS_ONE_LIE:  'two-truths',
    THIS_OR_THAT:        'this-or-that',
    FEEDBACK:            'feedback',
  } as Record<string, GameType>)[t] ?? 'trivia');
}

export function mapStatus(s: string): GameStatus {
  return (({
    PENDING: 'pending',
    ACTIVE:  'live',
    ENDED:   'ended',
  } as Record<string, GameStatus>)[s] ?? 'pending');
}

export function mapPhase(t: string): PhaseTab {
  return (({
    PRE_EVENT:     'pre-event',
    DURING_EVENT:  'main-event',
    POST_EVENT:    'post-event',
    BOTH:          'both',
  } as Record<string, PhaseTab>)[t] ?? 'main-event');
}

// ── Word puzzle grid builder ──────────────────────────────────────────────────

export function buildGridFromQuestions(questions: any[]): {
  grid: string[][];
  hiddenWords: HiddenWord[];
  timeLimitSecs: number;
} {
  const timeLimitSecs = questions.reduce((acc: number, q: any) =>
    q.timeLimitSecs > 0 ? Math.max(acc, q.timeLimitSecs) : acc, 60);

  // Unwrap single wrapper object from the backend (word-puzzle API shape)
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

  const seen = new Set<string>();
  const rawWords = flatEntries
    .map((q) => ({ word: extractWord(q), clue: q.text ?? q.clue ?? q.word ?? '', q }))
    .filter(({ word }) => word && !seen.has(word) && seen.add(word));

  // Backend provided a full grid
  if (wrapper) {
    const hiddenWords: HiddenWord[] = rawWords
      .filter(({ q }) => q.startCell && q.endCell)
      .map(({ word, clue, q }) => ({
        word, clue,
        startCell:  [q.startCell[0], q.startCell[1]] as [number, number],
        endCell:    [q.endCell[0],   q.endCell[1]]   as [number, number],
        direction:  q.direction ?? 'HORIZONTAL',
      }));
    return { grid: wrapper.grid, hiddenWords, timeLimitSecs };
  }

  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randLetter = () => ALPHA[Math.floor(Math.random() * ALPHA.length)];

  // Backend provided coordinates
  if (rawWords.every(({ q }) => q.startCell && q.endCell)) {
    let maxR = 0, maxC = 0;
    const hiddenWords: HiddenWord[] = rawWords.map(({ word, clue, q }) => {
      maxR = Math.max(maxR, q.startCell[0], q.endCell[0]);
      maxC = Math.max(maxC, q.startCell[1], q.endCell[1]);
      return {
        word, clue,
        startCell:  [q.startCell[0], q.startCell[1]] as [number, number],
        endCell:    [q.endCell[0],   q.endCell[1]]   as [number, number],
        direction:  q.direction ?? 'HORIZONTAL',
      };
    });
    const rows = maxR + 1, cols = maxC + 1;
    const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill(''));
    for (const hw of hiddenWords) {
      const [r1, c1] = hw.startCell, [r2, c2] = hw.endCell;
      const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
      let r = r1, c = c1;
      for (let i = 0; i < hw.word.length; i++) {
        grid[r][c] = hw.word[i];
        if (r === r2 && c === c2) break;
        r += dr; c += dc;
      }
    }
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (!grid[r][c]) grid[r][c] = randLetter();
    return { grid, hiddenWords, timeLimitSecs };
  }

  // Auto-place words in a generated grid
  const longest = rawWords.reduce((m, { word }) => Math.max(m, word.length), 0);
  const SIZE = Math.max(longest + 2, Math.ceil(Math.sqrt(rawWords.length * longest * 2.5)) + 2, 8);
  const grid: string[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
  const hiddenWords: HiddenWord[] = [];

  const DIRS = [
    { dr: 0, dc: 1, name: 'HORIZONTAL' },
    { dr: 1, dc: 0, name: 'VERTICAL' },
  ];

  const canPlace = (word: string, r: number, c: number, dr: number, dc: number) => {
    for (let i = 0; i < word.length; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) return false;
      if (grid[nr][nc] !== '' && grid[nr][nc] !== word[i]) return false;
    }
    return true;
  };

  for (const { word, clue } of rawWords) {
    let placed = false;
    for (const { dr, dc, name } of DIRS) {
      for (let r = 0; r < SIZE && !placed; r++) {
        for (let c = 0; c < SIZE && !placed; c++) {
          if (canPlace(word, r, c, dr, dc)) {
            for (let i = 0; i < word.length; i++) grid[r + dr * i][c + dc * i] = word[i];
            hiddenWords.push({
              word, clue,
              startCell: [r, c],
              endCell:   [r + dr * (word.length - 1), c + dc * (word.length - 1)],
              direction: name,
            });
            placed = true;
          }
        }
      }
      if (placed) break;
    }
  }

  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (!grid[r][c]) grid[r][c] = randLetter();

  return { grid, hiddenWords, timeLimitSecs };
}

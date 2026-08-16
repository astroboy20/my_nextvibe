/**
 * WordPuzzlePlayer
 *
 * Touch-driven word-search grid. The player drags across letters to select
 * a word. Uses PanResponder so the drag works correctly on both iOS and Android.
 */
import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { buildGridFromQuestions } from './buildGrid';
import type { CellState, HiddenWord } from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function cellsInRange(
  start: [number, number],
  end: [number, number]
): [number, number][] {
  const [r1, c1] = start;
  const [r2, c2] = end;
  const dr = Math.sign(r2 - r1);
  const dc = Math.sign(c2 - c1);
  const cells: [number, number][] = [];
  let r = r1, c = c1;
  const maxSteps = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1)) + 1;
  for (let i = 0; i < maxSteps; i++) {
    cells.push([r, c]);
    if (r === r2 && c === c2) break;
    r += dr;
    c += dc;
  }
  return cells;
}

// ── Cell ──────────────────────────────────────────────────────────────────────

function Cell({
  letter,
  state,
}: {
  letter: string;
  state: CellState;
}) {
  return (
    <View
      style={[
        cell.base,
        state === 'selecting' && cell.selecting,
        state === 'correct'   && cell.correct,
        state === 'wrong'     && cell.wrong,
      ]}
    >
      <Text
        style={[
          cell.text,
          (state === 'correct' || state === 'selecting') && cell.textLight,
        ]}
      >
        {letter}
      </Text>
    </View>
  );
}

const CELL_SIZE = 34;

const cell = StyleSheet.create({
  base: {
    width:           CELL_SIZE,
    height:          CELL_SIZE,
    borderRadius:    8,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: neutral[100],
    margin:          1,
  },
  selecting:  { backgroundColor: `${brand.primary}40` },
  correct:    { backgroundColor: semantic.success },
  wrong:      { backgroundColor: semantic.error },
  text:       { fontFamily: fontFamily.bold, fontSize: 13, color: neutral[700] },
  textLight:  { color: '#fff' },
});

// ── Grid ──────────────────────────────────────────────────────────────────────

function WordGrid({
  grid,
  hiddenWords,
  foundWords,
  onWordFound,
}: {
  grid: string[][];
  hiddenWords: HiddenWord[];
  foundWords: Set<string>;
  onWordFound: (word: string) => void;
}) {
  const rows  = grid.length;
  const cols  = grid[0]?.length ?? 0;
  const COLS  = cols;

  // Build flat cell-state array
  const [states, setStates] = useState<CellState[]>(
    () => Array(rows * cols).fill('idle')
  );

  const idx = (r: number, c: number) => r * COLS + c;

  // Re-apply correct highlights when foundWords changes
  const foundKey = [...foundWords].sort().join(',');
  useEffect(() => {
    setStates((prev) => {
      const next = prev.map((s) => (s === 'correct' ? 'correct' : 'idle')) as CellState[];
      for (const hw of hiddenWords) {
        if (foundWords.has(hw.word.toUpperCase())) {
          for (const [r, c] of cellsInRange(hw.startCell, hw.endCell)) {
            if (r >= 0 && r < rows && c >= 0 && c < cols) next[idx(r, c)] = 'correct';
          }
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundKey]);

  // Drag tracking
  const dragStart = useRef<[number, number] | null>(null);
  const dragCurrent = useRef<[number, number] | null>(null);
  const containerRef = useRef<View>(null);
  const [containerLayout, setContainerLayout] = useState({ x: 0, y: 0 });

  const cellFromPoint = useCallback(
    (px: number, py: number): [number, number] | null => {
      const cellW = CELL_SIZE + 2; // cell size + margin*2
      const c = Math.floor((px - containerLayout.x) / cellW);
      const r = Math.floor((py - containerLayout.y) / cellW);
      if (r < 0 || r >= rows || c < 0 || c >= COLS) return null;
      return [r, c];
    },
    [containerLayout, rows, COLS]
  );

  const applyHighlight = useCallback(
    (start: [number, number], end: [number, number], state: CellState) => {
      setStates((prev) => {
        const next = prev.map((s) =>
          s === 'correct' ? 'correct' : 'idle'
        ) as CellState[];
        for (const [r, c] of cellsInRange(start, end)) {
          if (r >= 0 && r < rows && c >= 0 && c < COLS) next[idx(r, c)] = state;
        }
        // Also re-apply already-found words
        for (const hw of hiddenWords) {
          if (foundWords.has(hw.word.toUpperCase())) {
            for (const [r, c] of cellsInRange(hw.startCell, hw.endCell)) {
              if (r >= 0 && r < rows && c >= 0 && c < COLS) next[idx(r, c)] = 'correct';
            }
          }
        }
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, COLS, foundWords]
  );

  const commitSelection = useCallback(
    (start: [number, number], end: [number, number]) => {
      const matched = hiddenWords.find(
        (hw) =>
          !foundWords.has(hw.word.toUpperCase()) &&
          ((hw.startCell[0] === start[0] &&
            hw.startCell[1] === start[1] &&
            hw.endCell[0] === end[0] &&
            hw.endCell[1] === end[1]) ||
            (hw.startCell[0] === end[0] &&
              hw.startCell[1] === end[1] &&
              hw.endCell[0] === start[0] &&
              hw.endCell[1] === start[1]))
      );

      if (matched) {
        applyHighlight(matched.startCell, matched.endCell, 'correct');
        onWordFound(matched.word.toUpperCase());
      } else {
        applyHighlight(start, end, 'wrong');
        setTimeout(() => {
          setStates((prev) =>
            prev.map((s) => (s === 'wrong' ? 'idle' : s)) as CellState[]
          );
        }, 500);
      }
    },
    [hiddenWords, foundWords, applyHighlight, onWordFound]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder:  () => true,

        onPanResponderGrant: (e) => {
          const { pageX, pageY } = e.nativeEvent;
          containerRef.current?.measure((_, __, _w, _h, px, py) => {
            setContainerLayout({ x: px, y: py });
            const c = cellFromPoint(pageX, pageY);
            if (c) {
              dragStart.current   = c;
              dragCurrent.current = c;
              applyHighlight(c, c, 'selecting');
            }
          });
        },

        onPanResponderMove: (e) => {
          if (!dragStart.current) return;
          const { pageX, pageY } = e.nativeEvent;
          const c = cellFromPoint(pageX, pageY);
          if (
            c &&
            (dragCurrent.current?.[0] !== c[0] ||
              dragCurrent.current?.[1] !== c[1])
          ) {
            dragCurrent.current = c;
            applyHighlight(dragStart.current, c, 'selecting');
          }
        },

        onPanResponderRelease: (e) => {
          if (!dragStart.current) return;
          const { pageX, pageY } = e.nativeEvent;
          const end =
            cellFromPoint(pageX, pageY) ??
            dragCurrent.current ??
            dragStart.current;
          commitSelection(dragStart.current, end);
          dragStart.current   = null;
          dragCurrent.current = null;
        },

        onPanResponderTerminate: () => {
          dragStart.current   = null;
          dragCurrent.current = null;
          setStates((prev) =>
            prev.map((s) => (s === 'selecting' ? 'idle' : s)) as CellState[]
          );
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cellFromPoint, applyHighlight, commitSelection]
  );

  return (
    <View
      ref={containerRef}
      onLayout={(e) => {
        const { x, y } = e.nativeEvent.layout;
        setContainerLayout({ x, y });
      }}
      {...panResponder.panHandlers}
    >
      {grid.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row.map((letter, c) => (
            <Cell
              key={`${r}-${c}`}
              letter={letter}
              state={states[idx(r, c)] ?? 'idle'}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  questions: any[];
  onSubmit: (answers: string[]) => void;
}

export default function WordPuzzlePlayer({ questions, onSubmit }: Props) {
  const { grid, hiddenWords, timeLimitSecs } = useMemo(
    () => buildGridFromQuestions(questions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions.length]
  );

  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [timeLeft,   setTimeLeft]   = useState(timeLimitSecs);
  const startRef = useRef(Date.now());

  const allFound = hiddenWords.length > 0 && hiddenWords.every((hw) => foundWords.has(hw.word));
  const urgent   = timeLeft <= 10;

  // Countdown
  useEffect(() => {
    if (allFound) return;
    const interval = setInterval(() => {
      const elapsed    = Math.floor((Date.now() - startRef.current) / 1000);
      const remaining  = timeLimitSecs - elapsed;
      if (remaining <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
        const answers = hiddenWords.map((hw) => (foundWords.has(hw.word) ? hw.word : ''));
        onSubmit(answers);
      } else {
        setTimeLeft(remaining);
      }
    }, 500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFound, timeLimitSecs]);

  const handleWordFound = (word: string) => {
    setFoundWords((prev) => new Set([...prev, word]));
  };

  const handleSubmit = () => {
    const answers = hiddenWords.map((hw) => (foundWords.has(hw.word) ? hw.word : ''));
    onSubmit(answers);
  };

  if (!grid.length) {
    return (
      <View style={s.center}>
        <Text style={s.empty}>No grid data for this puzzle.</Text>
      </View>
    );
  }

  const pct = (timeLeft / timeLimitSecs) * 100;

  return (
    <View style={s.wrap}>
      {/* Timer bar */}
      <View style={s.timerRow}>
        <Text style={s.timerLabel}>
          {foundWords.size} / {hiddenWords.length} words found
        </Text>
        <Text style={[s.timerCount, urgent && s.timerUrgent]}>
          <Ionicons name="timer-outline" size={12} /> {timeLeft}s
        </Text>
      </View>
      <View style={s.progressBg}>
        <View
          style={[
            s.progressFill,
            { width: `${pct}%` as any },
            urgent && s.progressUrgent,
          ]}
        />
      </View>

      {allFound && (
        <Text style={s.allFound}>All found! 🎉</Text>
      )}

      {/* Grid */}
      <WordGrid
        grid={grid}
        hiddenWords={hiddenWords}
        foundWords={foundWords}
        onWordFound={handleWordFound}
      />

      {/* Word list */}
      <View style={s.wordList}>
        <Text style={s.wordListTitle}>WORDS TO FIND</Text>
        <View style={s.wordGrid}>
          {hiddenWords.map((hw, i) => {
            const found = foundWords.has(hw.word.toUpperCase());
            return (
              <View
                key={`${hw.word}-${i}`}
                style={[s.wordChip, found && s.wordChipFound]}
              >
                <Ionicons
                  name={found ? 'checkmark-circle' : 'ellipse-outline'}
                  size={13}
                  color={found ? semantic.success : neutral[400]}
                />
                <Text
                  style={[s.wordChipText, found && s.wordChipTextFound]}
                >
                  {hw.word}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[s.btn, allFound && s.btnSuccess]}
        onPress={handleSubmit}
        activeOpacity={0.85}
      >
        <Text style={s.btnText}>
          {allFound
            ? 'Submit Answers'
            : `Submit (${hiddenWords.length - foundWords.size} remaining)`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:  { gap: 12 },
  center: { alignItems: 'center', paddingVertical: 20 },
  empty: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400] },

  timerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timerLabel: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[500] },
  timerCount: { fontFamily: fontFamily.bold, fontSize: fontSize.xs, color: neutral[700] },
  timerUrgent: { color: semantic.error },

  progressBg: {
    height: 4, borderRadius: 4,
    backgroundColor: neutral[100], overflow: 'hidden',
  },
  progressFill: {
    height: 4, borderRadius: 4,
    backgroundColor: brand.primary,
  },
  progressUrgent: { backgroundColor: semantic.error },

  allFound: {
    fontFamily: fontFamily.semibold,
    fontSize:   fontSize.sm,
    color:      semantic.success,
    textAlign:  'center',
  },

  wordList: { gap: 8 },
  wordListTitle: {
    fontFamily:    fontFamily.semibold,
    fontSize:      10,
    color:         neutral[500],
    letterSpacing: 0.8,
  },
  wordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  wordChip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderRadius:    20,
    borderWidth:     1,
    borderColor:     neutral[200],
    backgroundColor: neutral[50],
  },
  wordChipFound: {
    borderColor:     `${semantic.success}40`,
    backgroundColor: `${semantic.success}10`,
  },
  wordChipText: {
    fontFamily: fontFamily.bold,
    fontSize:   11,
    color:      neutral[700],
  },
  wordChipTextFound: {
    color:            semantic.success,
    textDecorationLine: 'line-through',
  },

  btn: {
    backgroundColor: brand.primary,
    borderRadius:    12,
    paddingVertical: 14,
    alignItems:      'center',
  },
  btnSuccess: { backgroundColor: semantic.success },
  btnText: {
    fontFamily: fontFamily.semibold,
    fontSize:   fontSize.sm,
    color:      '#fff',
  },
});

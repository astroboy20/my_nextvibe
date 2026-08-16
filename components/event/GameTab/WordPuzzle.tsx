/**
 * WordPuzzle
 *
 * Renders the interactive word-search grid and the "words to find" list.
 * Touch drag detection is handled via PanResponder on a single View that
 * covers the whole grid — the same pattern used in the web version with
 * pointer-capture, translated to React Native.
 */

import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { buildGridFromQuestions, type CellState, type HiddenWord } from './types';

// ── helpers ───────────────────────────────────────────────────────────────────

function highlightRange(
  states: CellState[][],
  start: [number, number],
  end: [number, number],
  state: CellState,
) {
  const [r1, c1] = start;
  const [r2, c2] = end;
  const dr = Math.sign(r2 - r1);
  const dc = Math.sign(c2 - c1);
  if (dr === 0 && dc === 0) { states[r1]?.[c1] && (states[r1][c1] = state); return; }
  let r = r1, c = c1;
  const max = Math.max(states.length, states[0]?.length ?? 0) + 1;
  for (let i = 0; i <= max; i++) {
    if (r >= 0 && r < states.length && c >= 0 && c < (states[0]?.length ?? 0)) {
      states[r][c] = state;
    }
    if (r === r2 && c === c2) break;
    r += dr; c += dc;
  }
}

// ── Grid ─────────────────────────────────────────────────────────────────────

interface GridProps {
  grid: string[][];
  hiddenWords: HiddenWord[];
  foundWords: Set<string>;
  onWordFound: (word: string) => void;
}

export function WordPuzzleGrid({ grid, hiddenWords, foundWords, onWordFound }: GridProps) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  const [cellStates, setCellStates] = useState<CellState[][]>(() =>
    Array.from({ length: rows }, () => Array(cols).fill('idle'))
  );

  // Reset on dimension change
  useEffect(() => {
    setCellStates(Array.from({ length: rows }, () => Array(cols).fill('idle')));
  }, [rows, cols]);

  // Sync "correct" highlights when foundWords changes
  const foundKey = [...foundWords].sort().join(',');
  useEffect(() => {
    setCellStates((prev) => {
      const next = prev.map((row) => row.map((c) => (c === 'correct' ? 'correct' : 'idle')));
      for (const hw of hiddenWords) {
        if (foundWords.has(hw.word.toUpperCase())) {
          highlightRange(next, hw.startCell, hw.endCell, 'correct');
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundKey]);

  // Drag tracking — all in refs to avoid stale closures
  const gridLayout  = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const dragStart   = useRef<[number, number] | null>(null);
  const dragCurrent = useRef<[number, number] | null>(null);
  const hiddenRef   = useRef(hiddenWords);
  hiddenRef.current = hiddenWords;
  const foundRef = useRef(foundWords);
  foundRef.current = foundWords;

  const cellFromOffset = (px: number, py: number): [number, number] | null => {
    const { width, height } = gridLayout.current;
    if (width === 0 || height === 0) return null;
    const cellW = width  / cols;
    const cellH = height / rows;
    const col = Math.floor(px / cellW);
    const row = Math.floor(py / cellH);
    if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
    return [row, col];
  };

  const applyHover = (start: [number, number], end: [number, number]) => {
    setCellStates((prev) => {
      const next = prev.map((row) => row.map((c) => (c === 'correct' ? 'correct' : 'idle')));
      highlightRange(next, start, end, 'hovered');
      return next;
    });
  };

  const commitSelection = (start: [number, number], end: [number, number]) => {
    const hw = hiddenRef.current;
    const fw = foundRef.current;
    const matched = hw.find(
      (h) =>
        !fw.has(h.word.toUpperCase()) &&
        ((h.startCell[0] === start[0] && h.startCell[1] === start[1] &&
          h.endCell[0] === end[0]     && h.endCell[1] === end[1]) ||
         (h.startCell[0] === end[0]   && h.startCell[1] === end[1] &&
          h.endCell[0] === start[0]   && h.endCell[1] === start[1]))
    );

    if (matched) {
      setCellStates((prev) => {
        const next = prev.map((row) => [...row]);
        highlightRange(next, matched.startCell, matched.endCell, 'correct');
        return next;
      });
      onWordFound(matched.word.toUpperCase());
    } else {
      setCellStates((prev) => {
        const next = prev.map((row) => row.map((c) => (c === 'correct' ? 'correct' : 'idle')));
        highlightRange(next, start, end, 'wrong');
        return next;
      });
      setTimeout(() => {
        setCellStates((prev) =>
          prev.map((row) => row.map((c) => (c === 'wrong' ? 'idle' : c)))
        );
      }, 500);
    }
    dragStart.current   = null;
    dragCurrent.current = null;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const cell = cellFromOffset(locationX, locationY);
        if (!cell) return;
        dragStart.current   = cell;
        dragCurrent.current = cell;
        applyHover(cell, cell);
      },
      onPanResponderMove: (e) => {
        if (!dragStart.current) return;
        const { locationX, locationY } = e.nativeEvent;
        const cell = cellFromOffset(locationX, locationY);
        if (!cell) return;
        if (
          dragCurrent.current &&
          dragCurrent.current[0] === cell[0] &&
          dragCurrent.current[1] === cell[1]
        ) return;
        dragCurrent.current = cell;
        applyHover(dragStart.current, cell);
      },
      onPanResponderRelease: (e) => {
        if (!dragStart.current) return;
        const { locationX, locationY } = e.nativeEvent;
        const end = cellFromOffset(locationX, locationY) ?? dragCurrent.current ?? dragStart.current;
        commitSelection(dragStart.current, end);
      },
      onPanResponderTerminate: () => {
        dragStart.current   = null;
        dragCurrent.current = null;
        setCellStates((prev) =>
          prev.map((row) => row.map((c) => (c === 'correct' ? 'correct' : 'idle')))
        );
      },
    })
  ).current;

  const cellSize = cols > 12 ? 26 : cols > 8 ? 30 : 34;

  return (
    <View style={g.wrap}>
      {/* Grid */}
      <View
        {...panResponder.panHandlers}
        onLayout={(e) => { gridLayout.current = e.nativeEvent.layout; }}
        style={[g.grid, { width: cellSize * cols, height: cellSize * rows }]}
      >
        {grid.map((row, rIdx) =>
          row.map((letter, cIdx) => {
            const state = cellStates[rIdx]?.[cIdx] ?? 'idle';
            return (
              <View
                key={`${rIdx}-${cIdx}`}
                style={[
                  g.cell,
                  { width: cellSize, height: cellSize },
                  state === 'hovered' && g.cellHovered,
                  state === 'correct' && g.cellCorrect,
                  state === 'wrong'   && g.cellWrong,
                ]}
              >
                <Text style={[g.letter, state === 'correct' && g.letterCorrect]}>
                  {letter}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {/* Words list */}
      <View style={g.wordList}>
        <Text style={g.wordListTitle}>Words to Find</Text>
        <View style={g.wordGrid}>
          {hiddenWords.map((hw, i) => {
            const found = foundWords.has(hw.word.toUpperCase());
            return (
              <View key={`${hw.word}-${i}`} style={[g.wordPill, found && g.wordPillFound]}>
                <Ionicons
                  name={found ? 'checkmark-circle' : 'ellipse-outline'}
                  size={12}
                  color={found ? semantic.success : neutral[400]}
                />
                <Text style={[g.wordText, found && g.wordTextFound]} numberOfLines={1}>
                  {hw.word}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ── Full round player ─────────────────────────────────────────────────────────

interface RoundPlayerProps {
  questions: any[];
  onComplete: (answers: string[]) => void;
}

export function WordPuzzleRoundPlayer({ questions, onComplete }: RoundPlayerProps) {
  const { grid, hiddenWords, timeLimitSecs } = useMemo(
    () => buildGridFromQuestions(questions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions.length]
  );

  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [timeLeft,   setTimeLeft]   = useState(timeLimitSecs);
  const [expired,    setExpired]    = useState(false);
  const startRef = useRef(Date.now());

  const allFound = hiddenWords.length > 0 && hiddenWords.every((hw) => foundWords.has(hw.word));

  useEffect(() => {
    if (allFound || expired) return;
    setTimeLeft(timeLimitSecs);
    startRef.current = Date.now();
    const iv = setInterval(() => {
      const remaining = timeLimitSecs - Math.floor((Date.now() - startRef.current) / 1000);
      if (remaining <= 0) {
        setTimeLeft(0);
        setExpired(true);
        clearInterval(iv);
        onComplete(hiddenWords.map((hw) => (foundWords.has(hw.word) ? hw.word : '')));
      } else {
        setTimeLeft(remaining);
      }
    }, 500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLimitSecs, allFound]);

  const timerUrgent = timeLeft <= 10;

  return (
    <View style={rp.wrap}>
      {/* Timer bar */}
      <View style={rp.timerRow}>
        <Text style={rp.timerFound}>
          {foundWords.size} / {hiddenWords.length} found
        </Text>
        <Text style={[rp.timerClock, timerUrgent && rp.timerUrgent]}>
          ⏱ {timeLeft}s
        </Text>
      </View>
      <View style={rp.progressTrack}>
        <View style={[rp.progressFill, { width: `${(timeLeft / timeLimitSecs) * 100}%` as any, backgroundColor: timerUrgent ? semantic.error : brand.primary }]} />
      </View>

      {allFound && <Text style={rp.allFound}>All found! 🎉</Text>}

      <WordPuzzleGrid
        grid={grid}
        hiddenWords={hiddenWords}
        foundWords={foundWords}
        onWordFound={(w) => setFoundWords((prev) => new Set([...prev, w]))}
      />

      <TouchableOpacity
        style={[rp.submitBtn, allFound && rp.submitBtnDone]}
        onPress={() => onComplete(hiddenWords.map((hw) => (foundWords.has(hw.word) ? hw.word : '')))}
        activeOpacity={0.85}
      >
        <Text style={rp.submitBtnText}>
          {allFound
            ? 'Submit Answers'
            : `Submit (${hiddenWords.length - foundWords.size} remaining)`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const g = StyleSheet.create({
  wrap:       { gap: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    alignSelf:     'center',
  },
  cell: {
    alignItems:      'center',
    justifyContent:  'center',
    margin:          1,
    borderRadius:    5,
    backgroundColor: neutral[100],
  },
  cellHovered: { backgroundColor: `${brand.primary}30` },
  cellCorrect: { backgroundColor: semantic.success },
  cellWrong:   { backgroundColor: semantic.error },
  letter:      { fontFamily: fontFamily.bold, fontSize: 13, color: neutral[800] },
  letterCorrect: { color: '#fff' },

  wordList:      { gap: 6 },
  wordListTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: neutral[500], textTransform: 'uppercase', letterSpacing: 0.8 },
  wordGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  wordPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: neutral[200],
    backgroundColor: neutral[50],
  },
  wordPillFound: { borderColor: `${semantic.success}50`, backgroundColor: `${semantic.success}12` },
  wordText:      { fontFamily: fontFamily.bold, fontSize: 12, color: neutral[800] },
  wordTextFound: { color: semantic.success, textDecorationLine: 'line-through' },
});

const rp = StyleSheet.create({
  wrap:          { gap: 14 },
  timerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timerFound:    { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[500] },
  timerClock:    { fontFamily: fontFamily.bold, fontSize: fontSize.xs, color: neutral[800] },
  timerUrgent:   { color: semantic.error },
  progressTrack: { height: 4, backgroundColor: neutral[100], borderRadius: 4, overflow: 'hidden' },
  progressFill:  { height: 4, borderRadius: 4 },
  allFound:      { textAlign: 'center', fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: semantic.success },
  submitBtn: {
    backgroundColor: brand.primary,
    paddingVertical: 12, borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnDone: { backgroundColor: semantic.success },
  submitBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: '#fff' },
});

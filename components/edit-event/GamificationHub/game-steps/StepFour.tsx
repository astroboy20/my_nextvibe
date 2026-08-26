/**
 * StepFour — Question editor (manual & AI-generated)
 */
import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Question } from '../types';

interface Props {
  roundIndex: number;
  totalRounds: number;
  roundTitle: string;
  contentMode: string;
  questions: Question[];
  generateQuestionsWithAI: () => void;
  editingQuestion: string | null;
  handleQuestionEdit: (id: string, field: string, value: string | number) => void;
  handleOptionEdit: (questionId: string, optionIndex: number, value: string) => void;
  setEditingQuestion: (id: string | null) => void;
  regenerateQuestion: (id: string) => void;
  gameType: string;
  setQuestions: (
    qs: Question[] | ((prev: Question[]) => Question[])
  ) => void;
}

export default function StepFour({
  roundIndex,
  totalRounds,
  roundTitle,
  contentMode,
  questions,
  generateQuestionsWithAI,
  editingQuestion,
  handleQuestionEdit,
  handleOptionEdit,
  setEditingQuestion,
  regenerateQuestion,
  gameType,
  setQuestions,
}: Props) {
  const addQuestion = () => {
    const newId = `q-${Date.now()}`;
    const isWordPuzzle  = gameType === 'word-puzzle';
    const isThisOrThat  = gameType === 'this-or-that';
    const isFeedback    = gameType === 'feedback';
    const optionCount   = gameType === 'two-truths' ? 3 : 4;
    setQuestions((prev: Question[]) => [
      ...prev,
      isWordPuzzle
        ? { id: newId, question: '', clue: '', correctAnswer: '', timeLimitSecs: 15, points: 10 }
        : isFeedback
        ? { id: newId, question: '', timeLimitSecs: 30 }
        : isThisOrThat
        ? {
            id: newId,
            question: '',
            options: ['True', 'False'],
            correctAnswerIndex: 0,
            correctAnswer: 'True',
            timeLimitSecs: 15,
            points: 5,
          }
        : {
            id: newId,
            question: '',
            options: Array(optionCount).fill(''),
            correctAnswerIndex: 0,
            correctAnswer: '',
            timeLimitSecs: 15,
            points: 10,
          },
    ]);
    setEditingQuestion(newId);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev: Question[]) => prev.filter((q) => q.id !== id));
    if (editingQuestion === id) setEditingQuestion(null);
  };

  return (
    <View style={s.root}>
      {/* Round header */}
      <View style={s.header}>
        <View style={s.roundBadge}>
          <Text style={s.roundBadgeText}>{roundIndex + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.roundTitle}>
            {roundTitle || `Round ${roundIndex + 1}`}
          </Text>
          <Text style={s.roundSub}>
            {roundIndex + 1} of {totalRounds} ·{' '}
            {questions.length} question
            {questions.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {contentMode === 'ai' && questions.length > 0 && (
          <TouchableOpacity
            style={s.regenBtn}
            onPress={generateQuestionsWithAI}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={13} color={neutral[600]} />
            <Text style={s.regenText}>Regenerate</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Empty state */}
      {questions.length === 0 && (
        <View style={s.emptyBox}>
          <Text style={s.emptyText}>No questions yet for this round.</Text>
          {contentMode === 'manual' ? (
            <TouchableOpacity
              style={s.addFirstBtn}
              onPress={addQuestion}
              activeOpacity={0.8}
            >
              <Ionicons name="add-outline" size={14} color="#fff" />
              <Text style={s.addFirstBtnText}>Add First Question</Text>
            </TouchableOpacity>
          ) : (
            <Text style={s.emptyHint}>
              Go back to generate questions with AI.
            </Text>
          )}
        </View>
      )}

      {/* Question list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {questions.map((q, index) => (
          <QuestionCard
            key={q.id}
            q={q}
            index={index}
            isEditing={editingQuestion === q.id}
            gameType={gameType}
            contentMode={contentMode}
            onEdit={() => setEditingQuestion(q.id)}
            onDone={() => setEditingQuestion(null)}
            onRemove={() => removeQuestion(q.id)}
            onRegenerate={() => regenerateQuestion(q.id)}
            handleQuestionEdit={handleQuestionEdit}
            handleOptionEdit={handleOptionEdit}
          />
        ))}

        {contentMode === 'manual' && questions.length > 0 && (
          <TouchableOpacity
            style={s.addMoreBtn}
            onPress={addQuestion}
            activeOpacity={0.8}
          >
            <Ionicons name="add-outline" size={16} color={neutral[500]} />
            <Text style={s.addMoreText}>Add Question</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ── Question card ──────────────────────────────────────────────────────────────

function QuestionCard({
  q,
  index,
  isEditing,
  gameType,
  contentMode,
  onEdit,
  onDone,
  onRemove,
  onRegenerate,
  handleQuestionEdit,
  handleOptionEdit,
}: {
  q: Question;
  index: number;
  isEditing: boolean;
  gameType: string;
  contentMode: string;
  onEdit: () => void;
  onDone: () => void;
  onRemove: () => void;
  onRegenerate: () => void;
  handleQuestionEdit: (id: string, field: string, value: string | number) => void;
  handleOptionEdit: (qId: string, idx: number, value: string) => void;
}) {
  if (isEditing) {
    return (
      <View style={qc.card}>
        <View style={qc.editHeader}>
          <View style={qc.badge}>
            <Text style={qc.badgeText}>Q{index + 1}</Text>
          </View>
          <TouchableOpacity onPress={onRemove}>
            <Ionicons name="trash-outline" size={16} color={semantic.error} />
          </TouchableOpacity>
        </View>

        {/* WORD PUZZLE */}
        {gameType === 'word-puzzle' ? (
          <>
            <Text style={qc.fieldLabel}>Clue (hint shown to players)</Text>
            <TextInput
              style={qc.input}
              value={q.clue ?? q.question}
              onChangeText={(v) => handleQuestionEdit(q.id, 'clue', v)}
              placeholder="e.g. A large African animal with a trunk"
              placeholderTextColor={neutral[400]}
              autoFocus
            />
            <Text style={qc.fieldLabel}>Answer (the word to solve)</Text>
            <TextInput
              style={qc.input}
              value={q.correctAnswer ?? ''}
              onChangeText={(v) => handleQuestionEdit(q.id, 'correctAnswer', v)}
              placeholder="e.g. ELEPHANT"
              placeholderTextColor={neutral[400]}
              autoCapitalize="characters"
            />
          </>
        ) : (
          <>
            <TextInput
              style={qc.inputBold}
              value={q.question}
              onChangeText={(v) => handleQuestionEdit(q.id, 'question', v)}
              placeholder={
                gameType === 'two-truths'
                  ? 'Theme / context (optional)'
                  : 'Type your question here…'
              }
              placeholderTextColor={neutral[400]}
              autoFocus
              multiline
            />

            {/* Options */}
            {q.options && (
              <View style={qc.optionsWrap}>
                {gameType === 'this-or-that' ? (
                  <>
                    <Text style={qc.optionHint}>
                      Is the statement true or false? — tap to mark
                    </Text>
                    <View style={qc.tfRow}>
                      {['True', 'False'].map((label, idx) => {
                        const active = q.correctAnswerIndex === idx;
                        return (
                          <TouchableOpacity
                            key={label}
                            style={[qc.tfBtn, active && qc.tfBtnActive]}
                            onPress={() =>
                              handleQuestionEdit(q.id, 'correctAnswerIndex', idx)
                            }
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[qc.tfText, active && qc.tfTextActive]}
                            >
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={qc.optionHint}>
                      {gameType === 'two-truths'
                        ? 'Enter 3 statements — tap circle to mark the LIE'
                        : 'Options — tap circle to mark correct answer'}
                    </Text>
                    {q.options.map((opt, optIdx) => {
                      const active = q.correctAnswerIndex === optIdx;
                      const isLie = gameType === 'two-truths' && active;
                      return (
                        <View key={optIdx} style={qc.optionRow}>
                          <TouchableOpacity
                            style={[
                              qc.optionCircle,
                              active && (isLie ? qc.optionCircleLie : qc.optionCircleCorrect),
                            ]}
                            onPress={() =>
                              handleQuestionEdit(q.id, 'correctAnswerIndex', optIdx)
                            }
                            activeOpacity={0.7}
                          >
                            {active ? (
                              <Ionicons name="checkmark" size={12} color="#fff" />
                            ) : (
                              <Text style={qc.optionCircleText}>
                                {String.fromCharCode(65 + optIdx)}
                              </Text>
                            )}
                          </TouchableOpacity>
                          <TextInput
                            style={qc.optionInput}
                            value={opt}
                            onChangeText={(v) => handleOptionEdit(q.id, optIdx, v)}
                            placeholder={
                              gameType === 'two-truths'
                                ? `Statement ${optIdx + 1}`
                                : `Option ${String.fromCharCode(65 + optIdx)}`
                            }
                            placeholderTextColor={neutral[400]}
                          />
                        </View>
                      );
                    })}
                  </>
                )}
              </View>
            )}
          </>
        )}

        {/* Time limit */}
        <View style={qc.footer}>
          <Text style={qc.fieldLabel}>Time limit (s)</Text>
          <TextInput
            style={qc.timeInput}
            value={String(q.timeLimitSecs)}
            onChangeText={(v) =>
              handleQuestionEdit(q.id, 'timeLimitSecs', Number(v))
            }
            keyboardType="number-pad"
          />
          <TouchableOpacity style={qc.doneBtn} onPress={onDone} activeOpacity={0.8}>
            <Ionicons name="checkmark" size={14} color="#fff" />
            <Text style={qc.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // View mode
  return (
    <View style={qc.cardView}>
      <View style={qc.badge}>
        <Text style={qc.badgeText}>Q{index + 1}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={qc.questionText} numberOfLines={2}>
          {gameType === 'word-puzzle'
            ? q.clue || 'No clue set'
            : q.question || 'Empty question'}
        </Text>
        {gameType === 'word-puzzle' ? (
          <Text style={qc.answerText}>
            Answer: {q.correctAnswer || 'Not set'}
          </Text>
        ) : q.options ? (
          <View style={qc.optionChips}>
            {q.options.map((opt, idx) => {
              const active = q.correctAnswerIndex === idx;
              const isLie = gameType === 'two-truths' && active;
              return (
                <View
                  key={idx}
                  style={[
                    qc.chip,
                    active && (isLie ? qc.chipLie : qc.chipCorrect),
                  ]}
                >
                  <Text
                    style={[
                      qc.chipText,
                      active && (isLie ? qc.chipTextLie : qc.chipTextCorrect),
                    ]}
                  >
                    {opt || `Option ${String.fromCharCode(65 + idx)}`}
                    {active && (isLie ? ' 🤥' : ' ✓')}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
        <Text style={qc.timeLimitText}>{q.timeLimitSecs}s limit</Text>
      </View>
      <View style={qc.actions}>
        <TouchableOpacity style={qc.actionBtn} onPress={onEdit}>
          <Ionicons name="create-outline" size={15} color={neutral[400]} />
        </TouchableOpacity>
        {contentMode === 'ai' && (
          <TouchableOpacity style={qc.actionBtn} onPress={onRegenerate}>
            <Ionicons name="refresh-outline" size={15} color={neutral[400]} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={qc.actionBtn} onPress={onRemove}>
          <Ionicons
            name="trash-outline"
            size={15}
            color={`${semantic.error}99`}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  roundBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: '#fff',
  },
  roundTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  roundSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
  regenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  regenText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: neutral[600],
  },
  emptyBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: neutral[200],
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
  },
  emptyHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addFirstBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: '#fff',
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: neutral[300],
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 16,
  },
  addMoreText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[500],
  },
});

const qc = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: `${brand.primary}50`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: neutral[0],
    gap: 8,
  },
  cardView: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: neutral[0],
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: neutral[100],
  },
  badgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: neutral[600],
  },
  fieldLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: neutral[500],
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: neutral[800],
    backgroundColor: neutral[0],
  },
  inputBold: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: neutral[800],
    backgroundColor: neutral[0],
    minHeight: 44,
  },
  optionsWrap: { gap: 6 },
  optionHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCircleCorrect: { backgroundColor: semantic.success },
  optionCircleLie:    { backgroundColor: semantic.error },
  optionCircleText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: neutral[800],
  },
  tfRow: { flexDirection: 'row', gap: 10 },
  tfBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: neutral[100],
  },
  tfBtnActive: {
    backgroundColor: semantic.success,
    borderColor: semantic.success,
  },
  tfText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[500],
  },
  tfTextActive: { color: '#fff' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  timeInput: {
    width: 60,
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: neutral[800],
    textAlign: 'center',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
    backgroundColor: brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  doneBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: '#fff',
  },
  // View mode
  questionText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
    lineHeight: 18,
  },
  answerText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: semantic.success,
    marginTop: 4,
  },
  optionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: neutral[100],
  },
  chipCorrect: { backgroundColor: `${semantic.success}20` },
  chipLie:     { backgroundColor: `${semantic.error}20` },
  chipText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
  },
  chipTextCorrect: { color: semantic.success, fontFamily: fontFamily.semibold },
  chipTextLie:     { color: semantic.error,   fontFamily: fontFamily.semibold },
  timeLimitText: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: neutral[400],
    marginTop: 4,
  },
  actions: { gap: 2 },
  actionBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
});

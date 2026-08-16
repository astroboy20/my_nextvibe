import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Props {
  questions: any[];
  onSubmit: (answers: string[]) => void;
}

export default function FeedbackPlayer({ questions, onSubmit }: Props) {
  const [answers, setAnswers] = useState<string[]>(() =>
    questions.map(() => '')
  );

  const update = (idx: number, val: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  return (
    <View style={s.wrap}>
      {questions.map((q: any, i: number) => (
        <View key={i} style={s.field}>
          <Text style={s.label}>{q.text}</Text>
          <TextInput
            style={s.input}
            value={answers[i]}
            onChangeText={(v) => update(i, v)}
            placeholder="Type your answer…"
            placeholderTextColor={neutral[400]}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      ))}

      <TouchableOpacity
        style={s.btn}
        onPress={() => onSubmit(answers)}
        activeOpacity={0.85}
      >
        <Text style={s.btnText}>Submit Feedback</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:  { gap: 16 },
  field: { gap: 6 },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize:   fontSize.sm,
    color:      neutral[800],
  },
  input: {
    borderWidth:   1,
    borderColor:   neutral[200],
    borderRadius:  12,
    padding:       12,
    fontFamily:    fontFamily.regular,
    fontSize:      fontSize.sm,
    color:         neutral[800],
    minHeight:     80,
  },
  btn: {
    backgroundColor: brand.primary,
    borderRadius:    12,
    paddingVertical: 14,
    alignItems:      'center',
  },
  btnText: {
    fontFamily: fontFamily.semibold,
    fontSize:   fontSize.sm,
    color:      '#fff',
  },
});

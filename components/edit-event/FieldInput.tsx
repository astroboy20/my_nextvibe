import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface Props {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
  error?: string;
  disabled?: boolean;
  hint?: string;
  maxLength?: number;
}

export default function FieldInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  error,
  disabled,
  hint,
  maxLength,
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={s.group}>
      <Text style={s.label}>{label}</Text>
      <View
        style={[
          s.inputWrap,
          focused && !disabled && s.focused,
          !!error && s.errored,
          disabled && s.disabled,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={neutral[400]}
          multiline={multiline}
          keyboardType={keyboardType}
          editable={!disabled}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[s.input, multiline && s.textarea, disabled && s.inputDisabled]}
        />
      </View>
      {hint && !error && <Text style={s.hint}>{hint}</Text>}
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  group:   { marginBottom: 16 },
  label:   { fontFamily: fontFamily.semibold, fontSize: 13, color: neutral[700], marginBottom: 6 },
  inputWrap: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 12,
    backgroundColor: neutral[50],
    overflow: 'hidden',
  },
  focused:  { borderColor: brand.primary, backgroundColor: neutral[0] },
  errored:  { borderColor: semantic.error },
  disabled: { backgroundColor: neutral[100] },
  input: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: neutral[800],
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textarea:      { minHeight: 96, textAlignVertical: 'top' },
  inputDisabled: { color: neutral[400] },
  hint:  { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[400], marginTop: 4 },
  error: { fontFamily: fontFamily.regular, fontSize: 11, color: semantic.error, marginTop: 4 },
});

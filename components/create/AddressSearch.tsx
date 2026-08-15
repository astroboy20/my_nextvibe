/**
 * AddressSearch — React Native equivalent of the web AddressSearch component.
 *
 * Uses the Google Places Autocomplete REST API (no native SDK needed).
 * Set EXPO_PUBLIC_GOOGLE_PLACES_KEY in your .env to enable suggestions.
 * Without a key it falls back to a plain text input (same UX, no autocomplete).
 *
 * Props mirror the web version:
 *   value      — controlled string value
 *   onChange   — called with (address, { lat, lon }?) on every change / selection
 */

import { brand, neutral, semantic } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ── Config ────────────────────────────────────────────────────────────────────

const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? 'AIzaSyC73yaRGGiQ-W1qpni-3WlKJJ3A1vWtmUs';

const AUTOCOMPLETE_URL =
  'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const GEOCODE_URL =
  'https://maps.googleapis.com/maps/api/geocode/json';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Prediction {
  place_id: string;
  description: string;
}

interface Coordinates {
  lat: number;
  lon: number;
}

export interface AddressSearchProps {
  value: string;
  onChange: (value: string, coordinates?: Coordinates) => void;
  placeholder?: string;
  error?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddressSearch({
  value,
  onChange,
  placeholder = 'Search or enter location',
  error,
}: AddressSearchProps) {
  const [inputValue,   setInputValue]   = useState(value);
  const [suggestions,  setSuggestions]  = useState<Prediction[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [focused,      setFocused]      = useState(false);

  // Prevent the debounce effect from re-fetching after a selection
  const isSelectingRef = useRef(false);
  const debounceTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value into local input (e.g. when form resets)
  useEffect(() => {
    if (!isSelectingRef.current) {
      setInputValue(value);
    }
  }, [value]);

  // ── Debounced autocomplete fetch ────────────────────────────────────────────

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || !PLACES_KEY) {
      setSuggestions([]);
      setDropdownOpen(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        input: query,
        key: PLACES_KEY,
        types: 'geocode|establishment',
      });
      const res = await fetch(`${AUTOCOMPLETE_URL}?${params}`);
      const json = await res.json();
      const preds: Prediction[] = json.predictions ?? [];
      setSuggestions(preds);
      setDropdownOpen(preds.length > 0);
    } catch {
      setSuggestions([]);
      setDropdownOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTextChange = (text: string) => {
    setInputValue(text);
    onChange(text); // propagate raw text immediately

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!text.trim()) {
      setSuggestions([]);
      setDropdownOpen(false);
      return;
    }
    debounceTimer.current = setTimeout(() => {
      if (!isSelectingRef.current) fetchSuggestions(text);
    }, 250);
  };

  // ── Geocode & select ────────────────────────────────────────────────────────

  const handleSelect = useCallback(async (place: Prediction) => {
    isSelectingRef.current = true;
    setInputValue(place.description);
    setSuggestions([]);
    setDropdownOpen(false);

    if (!PLACES_KEY) {
      onChange(place.description);
      isSelectingRef.current = false;
      return;
    }

    try {
      const params = new URLSearchParams({ place_id: place.place_id, key: PLACES_KEY });
      const res  = await fetch(`${GEOCODE_URL}?${params}`);
      const json = await res.json();
      const loc  = json.results?.[0]?.geometry?.location;
      onChange(
        place.description,
        loc ? { lat: loc.lat, lon: loc.lng } : undefined,
      );
    } catch {
      onChange(place.description);
    } finally {
      isSelectingRef.current = false;
    }
  }, [onChange]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  const borderColor = error ? semantic.error : focused ? brand.primary : neutral[200];

  return (
    <View>
      {/* Input row */}
      <View style={[s.inputWrap, { borderColor }]}>
        <Ionicons name="location-outline" size={16} color={neutral[400]} style={s.prefixIcon} />
        <TextInput
          value={inputValue}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={neutral[400]}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            // Small delay so tapping a suggestion isn't eaten by blur
            setTimeout(() => setDropdownOpen(false), 150);
          }}
          style={s.input}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {loading && <ActivityIndicator size="small" color={brand.primary} style={s.suffix} />}
        {!loading && inputValue.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setInputValue('');
              onChange('');
              setSuggestions([]);
              setDropdownOpen(false);
            }}
            style={s.suffix}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={16} color={neutral[400]} />
          </TouchableOpacity>
        )}
      </View>

      {!!error && <Text style={s.errorText}>{error}</Text>}

      {/* Suggestions dropdown — rendered in a Modal to escape scroll clipping */}
      <Modal
        visible={dropdownOpen && suggestions.length > 0}
        transparent
        animationType="none"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setDropdownOpen(false)}>
          {/* Sheet positions near top of screen since we don't know exact input Y */}
          <View style={s.dropdownSheet}>
            <View style={s.dropdownHeader}>
              <Ionicons name="location-outline" size={14} color={neutral[500]} />
              <Text style={s.dropdownHeaderText}>Suggestions</Text>
              <TouchableOpacity onPress={() => setDropdownOpen(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color={neutral[400]} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.place_id}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    s.suggestion,
                    index === suggestions.length - 1 && s.suggestionLast,
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.75}
                >
                  <View style={s.pinCircle}>
                    <Ionicons name="location" size={12} color={brand.primary} />
                  </View>
                  <Text style={s.suggestionText} numberOfLines={2}>
                    {item.description}
                  </Text>
                </TouchableOpacity>
              )}
            />

          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: neutral[200],
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    gap: 8,
  },
  prefixIcon: { flexShrink: 0 },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
    paddingVertical: 0,
  },
  suffix: { flexShrink: 0 },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: semantic.error,
    marginTop: 4,
  },

  // Modal backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },

  // Dropdown sheet (bottom sheet style)
  dropdownSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 4,
    paddingBottom: 32,
    maxHeight: '55%',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  dropdownHeaderText: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[600],
  },

  // Suggestion row
  suggestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  suggestionLast: {
    borderBottomWidth: 0,
  },
  pinCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: `${brand.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  suggestionText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[700],
    lineHeight: 20,
  },
});

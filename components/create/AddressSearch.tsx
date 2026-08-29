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
  const showDropdown = dropdownOpen && suggestions.length > 0;

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
            setTimeout(() => setDropdownOpen(false), 200);
          }}
          style={s.input}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          blurOnSubmit={false}
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

      {/* Inline suggestions list — plain View.map, no FlatList, avoids nested VirtualizedList warning */}
      {showDropdown && (
        <View style={s.dropdownSheet}>
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={item.place_id}
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
          ))}
        </View>
      )}
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

  // Inline dropdown — appears directly below the input, inside the scroll
  dropdownSheet: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    marginTop: 4,
    maxHeight: 220,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
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

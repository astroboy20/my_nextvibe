import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import LockedBanner from './LockedBanner';
import { isEventStarted } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Tag { id: string; name: string; }

interface Props {
  event: {
    id: string;
    startsAt?: string | null;
    tags?: Tag[];
    vibeTags?: Tag[];
  };
  allTags?: Tag[];
  isAdding?: boolean;
  isRemoving?: boolean;
  isCreating?: boolean;
  removingTagId?: string | null;
  onAdd: (tagId: string) => void;
  onRemove: (tagId: string) => void;
  onCreateAndAdd: (name: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EventTagsEditor({
  event,
  allTags = [],
  isAdding,
  isRemoving,
  isCreating,
  removingTagId,
  onAdd,
  onRemove,
  onCreateAndAdd,
}: Props) {
  const locked = isEventStarted(event?.startsAt);
  const [input, setInput] = useState('');

  const eventTagIds: string[] = (event?.tags ?? event?.vibeTags ?? []).map((t) => t.id);
  const attachedTags = allTags.filter((t) => eventTagIds.includes(t.id));
  const availableTags = allTags.filter((t) => !eventTagIds.includes(t.id));

  const filteredAvailable = input
    ? availableTags.filter((t) => t.name.toLowerCase().includes(input.toLowerCase()))
    : availableTags;

  const showCreate =
    input.trim() &&
    !allTags.some((t) => t.name.toLowerCase() === input.trim().toLowerCase());

  const handleCreate = () => {
    const name = input.trim();
    if (!name) return;
    onCreateAndAdd(name);
    setInput('');
  };

  return (
    <View style={s.root}>
      {locked && (
        <LockedBanner message="Tag editing is locked once the event has started." />
      )}

      {/* Attached tags */}
      {attachedTags.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>ACTIVE TAGS</Text>
          <View style={s.chipRow}>
            {attachedTags.map((tag) => (
              <View key={tag.id} style={s.chip}>
                <Text style={s.chipText}>{tag.name}</Text>
                {!locked && (
                  <TouchableOpacity
                    onPress={() => onRemove(tag.id)}
                    disabled={removingTagId === tag.id}
                    hitSlop={6}
                    style={s.chipRemove}
                  >
                    {removingTagId === tag.id ? (
                      <ActivityIndicator size={11} color={neutral[400]} />
                    ) : (
                      <Ionicons name="close" size={13} color={neutral[400]} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Add tags */}
      {!locked && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>ADD TAGS</Text>
          <TextInput
            style={s.searchInput}
            value={input}
            onChangeText={setInput}
            placeholder="Search or create a tag..."
            placeholderTextColor={neutral[400]}
          />

          {filteredAvailable.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.availableRow}
            >
              {filteredAvailable.map((tag) => (
                <TouchableOpacity
                  key={tag.id}
                  style={s.addChip}
                  onPress={() => { onAdd(tag.id); setInput(''); }}
                  disabled={isAdding}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={13} color={brand.primary} />
                  <Text style={s.addChipText}>{tag.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {showCreate && (
            <TouchableOpacity
              style={s.createChip}
              onPress={handleCreate}
              disabled={isCreating || isAdding}
              activeOpacity={0.7}
            >
              {isCreating ? (
                <ActivityIndicator size={13} color={brand.primary} />
              ) : (
                <Ionicons name="add-circle-outline" size={14} color={brand.primary} />
              )}
              <Text style={s.createChipText}>Create "{input.trim()}"</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {attachedTags.length === 0 && availableTags.length === 0 && !input && (
        <Text style={s.empty}>No tags found. Type a name above to create one.</Text>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { gap: 4 },
  section: { gap: 8 },
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: neutral[400],
    letterSpacing: 0.8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
  },
  chipText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[700],
  },
  chipRemove: { marginLeft: 2 },

  searchInput: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
    backgroundColor: neutral[50],
  },

  availableRow: { gap: 8, paddingVertical: 2 },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: `${brand.primary}50`,
  },
  addChipText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: brand.primary,
  },

  createChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: brand.primary,
    backgroundColor: `${brand.primary}08`,
  },
  createChipText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: brand.primary,
  },

  empty: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    textAlign: 'center',
    paddingVertical: 8,
  },
});

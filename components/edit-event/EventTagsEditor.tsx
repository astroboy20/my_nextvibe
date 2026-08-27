/**
 * EventTagsEditor.tsx — React Native
 *
 * Self-contained tag management:
 *  • Fetches all global tags from GET /v1/discover/tags
 *  • Maintains its own local selectedIds set — does NOT rely on parent state
 *  • Seeds from event.tags on mount, stays updated after every add / remove
 *  • All available tags shown in flex-wrap grid (no horizontal scroll)
 *  • Skeleton placeholders while loading
 *  • Success toast banners for add / create / remove
 *  • Lock-aware (event already started → read-only)
 */

import { brand, neutral, semantic } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import {
    useAddEventTagsMutation,
    useRemoveEventTagsMutation,
} from "@/store/api/eventsApi";
import {
    useCreateTagMutation,
    useGetAllTagsQuery,
} from "@/store/api/tagsApi";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import LockedBanner from "./LockedBanner";
import { isEventStarted } from "./types";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Tag {
  id: string;
  name: string;
}

interface Props {
  event: {
    id: string;
    startsAt?: string | null;
    tags?: Tag[];
  };
  /** Called whenever the selected-tag count changes so the parent badge stays live */
  onCountChange?: (count: number) => void;
}

// ─── Skeleton chip ──────────────────────────────────────────────────────────────

function SkeletonChip() {
  return <View style={s.skeleton} />;
}

// ─── Toast banner ───────────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
}
function ToastBanner({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [message]);
  const isSuccess = type === "success";
  return (
    <View style={[s.toast, isSuccess ? s.toastSuccess : s.toastError]}>
      <Ionicons
        name={isSuccess ? "checkmark-circle-outline" : "alert-circle-outline"}
        size={14}
        color={isSuccess ? semantic.success : semantic.error}
      />
      <Text
        style={[
          s.toastText,
          { color: isSuccess ? semantic.success : semantic.error },
        ]}
      >
        {message}
      </Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={8}>
        <Ionicons
          name="close"
          size={13}
          color={isSuccess ? semantic.success : semantic.error}
        />
      </TouchableOpacity>
    </View>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function EventTagsEditor({ event, onCountChange }: Props) {
  const locked = isEventStarted(event?.startsAt);

  // ── Remote data ────────────────────────────────────────────────────────────
  const { data: allTags = [], isLoading: isLoadingTags } = useGetAllTagsQuery();
  const [addTags, { isLoading: isAdding }] = useAddEventTagsMutation();
  const [removeTags, { isLoading: isRemoving }] = useRemoveEventTagsMutation();
  const [createTag, { isLoading: isCreating }] = useCreateTagMutation();

  // ── Own selected-ids set (source of truth, seeded ONCE from event.tags) ──
  // We do NOT re-seed from event.tags after mount because the parent's
  // localTags state doesn't reflect server removals until a full refetch.
  // This component owns the tag state completely after initial seed.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set((event?.tags ?? []).map((t) => t.id))
  );

  // Only re-seed if the event ID itself changes (navigating to a different event)
  const prevEventIdRef = React.useRef(event?.id);
  React.useEffect(() => {
    if (event?.id && event.id !== prevEventIdRef.current) {
      prevEventIdRef.current = event.id;
      setSelectedIds(new Set((event?.tags ?? []).map((t) => t.id)));
      setInput("");
      setToast(null);
    }
  }, [event?.id]);

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [input, setInput] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") =>
    setToast({ msg, type });

  // Notify parent whenever the live count changes
  useEffect(() => {
    onCountChange?.(selectedIds.size);
  }, [selectedIds.size]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedTags = useMemo(
    () => allTags.filter((t) => selectedIds.has(t.id)),
    [allTags, selectedIds]
  );

  const availableTags = useMemo(
    () => allTags.filter((t) => !selectedIds.has(t.id)),
    [allTags, selectedIds]
  );

  const filteredAvailable = useMemo(() => {
    if (!input.trim()) return availableTags;
    return availableTags.filter((t) =>
      t.name.toLowerCase().includes(input.toLowerCase())
    );
  }, [availableTags, input]);

  const showCreate = useMemo(
    () =>
      input.trim().length > 0 &&
      !allTags.some((t) => t.name.toLowerCase() === input.trim().toLowerCase()),
    [input, allTags]
  );

  const isBusy =
    isAdding || isRemoving || isCreating || !!addingId || !!removingId;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAdd = async (tag: Tag) => {
    if (selectedIds.has(tag.id)) return;
    setAddingId(tag.id);
    // Optimistic
    setSelectedIds((prev) => new Set([...prev, tag.id]));
    try {
      await addTags({ eventId: event.id, tagIds: [tag.id] }).unwrap();
      showToast(`"${tag.name}" added`);
      setInput("");
    } catch (e: any) {
      // Roll back
      setSelectedIds((prev) => {
        const n = new Set(prev);
        n.delete(tag.id);
        return n;
      });
      showToast(e?.data?.message ?? "Failed to add tag.", "error");
    } finally {
      setAddingId(null);
    }
  };

  const handleRemove = async (tag: Tag) => {
    setRemovingId(tag.id);
    // Optimistic
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.delete(tag.id);
      return n;
    });
    try {
      await removeTags({ eventId: event.id, tagIds: [tag.id] }).unwrap();
      showToast(`"${tag.name}" removed`);
    } catch (e: any) {
      // Roll back
      setSelectedIds((prev) => new Set([...prev, tag.id]));
      showToast(e?.data?.message ?? "Failed to remove tag.", "error");
    } finally {
      setRemovingId(null);
    }
  };

  const handleCreate = async () => {
    const name = input.trim();
    if (!name) return;
    try {
      const newTag = await createTag({ name }).unwrap();
      if (!newTag?.id) {
        showToast("No tag ID from server.", "error");
        return;
      }
      // Optimistic add
      setSelectedIds((prev) => new Set([...prev, newTag.id]));
      await addTags({ eventId: event.id, tagIds: [newTag.id] }).unwrap();
      showToast(`"${newTag.name}" created & added`);
      setInput("");
    } catch (e: any) {
      showToast(e?.data?.message ?? "Failed to create tag.", "error");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      {locked && (
        <LockedBanner message="Tag editing is locked once the event has started." />
      )}

      {/* Toast */}
      {toast && (
        <ToastBanner
          message={toast.msg}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* ── Selected tags ──────────────────────────────────────── */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>
          SELECTED TAGS
          {selectedTags.length > 0 ? ` (${selectedTags.length})` : ""}
        </Text>

        {isLoadingTags ? (
          /* Skeleton */
          <View style={s.chipWrap}>
            {[1, 2, 3].map((i) => (
              <SkeletonChip key={i} />
            ))}
          </View>
        ) : selectedTags.length === 0 ? (
          <Text style={s.emptyHint}>No tags selected yet.</Text>
        ) : (
          <View style={s.chipWrap}>
            {selectedTags.map((tag) => (
              <View key={tag.id} style={s.selectedChip}>
                <Ionicons
                  name="checkmark-circle"
                  size={13}
                  color={brand.primary}
                />
                <Text style={s.selectedChipText}>{tag.name}</Text>
                {!locked && (
                  <TouchableOpacity
                    onPress={() => handleRemove(tag)}
                    disabled={removingId === tag.id || isBusy}
                    hitSlop={6}
                    style={s.chipRemove}
                  >
                    {removingId === tag.id ? (
                      <ActivityIndicator size={11} color={neutral[400]} />
                    ) : (
                      <Ionicons name="close" size={13} color={neutral[400]} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Search + add ───────────────────────────────────────── */}
      {!locked && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>ADD TAGS</Text>

          {/* Search bar */}
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={15} color={neutral[400]} />
            <TextInput
              style={s.searchInput}
              value={input}
              onChangeText={setInput}
              placeholder="Search or create a tag…"
              placeholderTextColor={neutral[400]}
              autoCapitalize="none"
              editable={!isBusy}
            />
            {input.length > 0 && (
              <TouchableOpacity onPress={() => setInput("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={neutral[300]} />
              </TouchableOpacity>
            )}
          </View>

          {/* Available tags — flex-wrap grid */}
          {isLoadingTags ? (
            <View style={s.chipWrap}>
              {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonChip key={i} />
              ))}
            </View>
          ) : filteredAvailable.length > 0 ? (
            <View style={s.chipWrap}>
              {filteredAvailable.map((tag) => {
                const isBeingAdded = addingId === tag.id;
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[s.availableChip, isBeingAdded && s.chipLoading]}
                    onPress={() => handleAdd(tag)}
                    disabled={isBusy}
                    activeOpacity={0.7}
                  >
                    {isBeingAdded ? (
                      <ActivityIndicator size={11} color={brand.primary} />
                    ) : (
                      <Ionicons name="add" size={13} color={brand.primary} />
                    )}
                    <Text style={s.availableChipText}>{tag.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : input.trim().length > 0 && !showCreate ? (
            <Text style={s.noResults}>No tags match "{input.trim()}"</Text>
          ) : null}

          {/* Create new tag button */}
          {showCreate && (
            <TouchableOpacity
              style={[s.createChip, isBusy && s.chipDisabled]}
              onPress={handleCreate}
              disabled={isBusy}
              activeOpacity={0.7}
            >
              {isCreating ? (
                <ActivityIndicator size={13} color="#fff" />
              ) : (
                <Ionicons name="add-circle-outline" size={15} color="#fff" />
              )}
              <Text style={s.createChipText}>
                {isCreating ? "Creating…" : `Create "${input.trim()}"`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { gap: 16 },
  section: { gap: 10 },

  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: neutral[400],
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  emptyHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    paddingVertical: 4,
  },

  // Toast
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  toastSuccess: {
    borderColor: `${semantic.success}40`,
    backgroundColor: `${semantic.success}10`,
  },
  toastError: {
    borderColor: `${semantic.error}40`,
    backgroundColor: `${semantic.error}08`,
  },
  toastText: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
  },

  // Chip grid — flex-wrap, no scroll
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  // Skeleton
  skeleton: {
    width: 72,
    height: 32,
    borderRadius: 20,
    backgroundColor: neutral[100],
  },

  // Selected chip
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${brand.primary}50`,
    backgroundColor: `${brand.primary}12`,
  },
  selectedChipText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: brand.primary,
  },
  chipRemove: { marginLeft: 2 },

  // Search bar
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 12,
    backgroundColor: neutral[50],
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
    paddingVertical: 0,
  },

  // Available chip (dashed border)
  availableChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: `${brand.primary}60`,
    backgroundColor: `${brand.primary}06`,
  },
  chipLoading: { opacity: 0.6 },
  availableChipText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: brand.primary,
  },

  noResults: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    paddingVertical: 4,
  },

  // Create chip (solid)
  createChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: brand.primary,
  },
  chipDisabled: { opacity: 0.55 },
  createChipText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: "#fff",
  },
});

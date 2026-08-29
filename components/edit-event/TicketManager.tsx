/**
 * TicketManager.tsx — React Native
 *
 * Features
 * ────────
 * • Revenue + sold summary strip (with skeleton)
 * • Create ticket bottom-sheet — native date/time picker for sale end date
 * • Ticket list rows matching design: thumbnail | name + price badge | desc | sold/qty | edit+delete
 * • Edit sheet — image only (all other fields locked after creation)
 * • Delete confirmation modal
 * • Payout strip when event ENDED
 */

import DateTimeTrigger from "@/components/ui/DateTimeTrigger";
import { brand, neutral, semantic } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useUploadIntentMutation } from "@/store/api/eventsApi";
import {
  useCreateTicketTierMutation,
  useDeleteTicketTierMutation,
  useGetTicketTiersQuery,
  useUpdateTicketTierMutation,
  type TicketTier,
} from "@/store/api/ticketsApi";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import FieldInput from "./FieldInput";

// ─── Constants ─────────────────────────────────────────────────────────────────

const MAX_IMAGE_MB = 5;
const CURRENCIES = ["NGN", "USD", "GBP", "EUR"] as const;
type Currency = (typeof CURRENCIES)[number];

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price: number, currency = "NGN") {
  const sym = CURRENCY_SYMBOLS[currency as Currency] ?? currency;
  return `${sym}${price.toLocaleString()}`;
}

function isSoldOut(tier: TicketTier) {
  return (tier.quantity ?? 0) > 0 && tier.quantitySold >= (tier.quantity ?? 0);
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function TicketSkeleton() {
  return (
    <View style={sk.wrap}>
      {[1, 2].map((i) => (
        <View key={i} style={sk.row}>
          <View style={sk.thumb} />
          <View style={sk.info}>
            <View style={sk.line1} />
            <View style={sk.line2} />
            <View style={sk.line3} />
          </View>
        </View>
      ))}
    </View>
  );
}

const sk = StyleSheet.create({
  wrap: { gap: 10 },
  row: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[0],
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: neutral[100],
  },
  info: { flex: 1, gap: 8, justifyContent: "center" },
  line1: {
    height: 14,
    width: "60%",
    borderRadius: 6,
    backgroundColor: neutral[100],
  },
  line2: {
    height: 11,
    width: "40%",
    borderRadius: 6,
    backgroundColor: neutral[100],
  },
  line3: {
    height: 11,
    width: "30%",
    borderRadius: 6,
    backgroundColor: neutral[100],
  },
});

// ─── Image upload ───────────────────────────────────────────────────────────────

type UploadStatus = "idle" | "uploading" | "done" | "error";
interface ImageUploadState {
  status: UploadStatus;
  uri: string | null;
  remoteUrl: string | null;
  progress: number;
}
const IDLE_UPLOAD: ImageUploadState = {
  status: "idle",
  uri: null,
  remoteUrl: null,
  progress: 0,
};
function fromUrl(url?: string | null): ImageUploadState {
  return url
    ? { status: "done", uri: null, remoteUrl: url, progress: 100 }
    : IDLE_UPLOAD;
}

function TicketImagePicker({
  state,
  eventId,
  onStateChange,
}: {
  state: ImageUploadState;
  eventId: string;
  onStateChange: (s: ImageUploadState) => void;
}) {
  const [uploadIntent] = useUploadIntentMutation();
  const displayUri = state.uri ?? state.remoteUrl;

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo access to upload a ticket image."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_MB * 1024 * 1024) {
      Alert.alert("File too large", `Max ${MAX_IMAGE_MB} MB.`);
      return;
    }

    onStateChange({
      status: "uploading",
      uri: asset.uri,
      remoteUrl: null,
      progress: 0,
    });
    try {
      const ext = asset.uri.split(".").pop() ?? "jpg";
      const mime = ext === "png" ? "image/png" : "image/jpeg";
      const intent = await uploadIntent({
        filename: `ticket-${Date.now()}.${ext}`,
        contentType: mime,
        folder: "ticket-tiers",
      }).unwrap();
      const blob = await (await fetch(asset.uri)).blob();
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", intent.data.uploadUrl);
      xhr.setRequestHeader("Content-Type", mime);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          onStateChange({
            status: "uploading",
            uri: asset.uri,
            remoteUrl: null,
            progress: Math.round((e.loaded * 100) / e.total),
          });
      };
      await new Promise<void>((res, rej) => {
        xhr.onload = () => (xhr.status < 300 ? res() : rej());
        xhr.onerror = rej;
        xhr.send(blob);
      });
      onStateChange({
        status: "done",
        uri: asset.uri,
        remoteUrl: intent.data.fileUrl,
        progress: 100,
      });
    } catch {
      onStateChange({
        status: "error",
        uri: null,
        remoteUrl: null,
        progress: 0,
      });
      Alert.alert("Upload failed", "Could not upload image. Please try again.");
    }
  };

  if (state.status === "uploading") {
    return (
      <View style={ip.uploading}>
        <ActivityIndicator color={brand.primary} />
        <Text style={ip.uploadingText}>Uploading… {state.progress}%</Text>
      </View>
    );
  }

  if (displayUri) {
    return (
      <View style={ip.previewWrap}>
        <Image
          source={{ uri: displayUri }}
          style={ip.preview}
          resizeMode="cover"
        />
        <View style={ip.overlay}>
          <TouchableOpacity
            style={ip.overlayBtn}
            onPress={pick}
            activeOpacity={0.8}
          >
            <Ionicons name="image-outline" size={14} color="#fff" />
            <Text style={ip.overlayBtnText}>Change</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[ip.overlayBtn, ip.removeBtn]}
            onPress={() => onStateChange(IDLE_UPLOAD)}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={14} color="#fff" />
            <Text style={ip.overlayBtnText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity style={ip.placeholder} onPress={pick} activeOpacity={0.8}>
      <Ionicons name="image-outline" size={26} color={neutral[400]} />
      <Text style={ip.placeholderText}>Upload ticket image</Text>
      <Text style={ip.placeholderSub}>
        PNG or JPEG · max {MAX_IMAGE_MB} MB (optional)
      </Text>
    </TouchableOpacity>
  );
}

const ip = StyleSheet.create({
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 110,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: neutral[200],
    backgroundColor: neutral[50],
  },
  placeholderText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[500],
  },
  placeholderSub: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: neutral[400],
  },
  uploading: {
    height: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadingText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
  },
  previewWrap: { borderRadius: 14, overflow: "hidden", height: 130 },
  preview: { width: "100%", height: "100%" },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 8,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  overlayBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  removeBtn: {
    flex: 0,
    paddingHorizontal: 14,
    backgroundColor: "rgba(239,68,68,0.65)",
  },
  overlayBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: "#fff",
  },
});

// ─── CreateSheet ───────────────────────────────────────────────────────────────

const BLANK = {
  name: "",
  description: "",
  perks: "",
  price: "",
  quantity: "",
  currency: "NGN" as Currency,
};

function CreateSheet({
  eventId,
  visible,
  onDismiss,
  onCreated,
}: {
  eventId: string;
  visible: boolean;
  onDismiss: () => void;
  onCreated: (t: TicketTier) => void;
}) {
  const [form, setForm] = useState({ ...BLANK });
  const [image, setImage] = useState<ImageUploadState>(IDLE_UPLOAD);
  const [saleEndDate, setSaleEndDate] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [createTicket, { isLoading }] = useCreateTicketTierMutation();

  const reset = () => {
    setForm({ ...BLANK });
    setImage(IDLE_UPLOAD);
    setSaleEndDate("");
    setError(null);
  };
  const handleDismiss = () => {
    reset();
    onDismiss();
  };
  const f = (k: keyof typeof BLANK) => (v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError("Ticket name is required.");
      return;
    }
    if (!form.price.trim() || isNaN(Number(form.price))) {
      setError("Enter a valid price (0 for free).");
      return;
    }
    if (image.status === "uploading") {
      setError("Wait for the image to finish uploading.");
      return;
    }
    setError(null);
    try {
      const payload: any = {
        name: form.name.trim(),
        price: Number(form.price),
        currency: form.currency,
      };
      if (form.description.trim())
        payload.description = form.description.trim();
      if (form.perks.trim()) payload.perks = form.perks.trim();
      if (form.quantity.trim()) payload.quantity = Number(form.quantity);
      if (saleEndDate) payload.ticketEndDate = saleEndDate;
      if (image.remoteUrl) payload.imageUrl = image.remoteUrl;

      const res = await createTicket({ eventId, ticketData: payload }).unwrap();
      if (res?.success && res?.data) {
        onCreated(res.data);
        reset();
        onDismiss();
      } else setError("Unexpected response. Please try again.");
    } catch (e: any) {
      setError(e?.data?.message ?? "Failed to create ticket tier.");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleDismiss}
    >
      <View style={sh.backdrop} />
      <View style={sh.sheet}>
        {/* Header */}
        <View style={sh.header}>
          <Ionicons name="ticket-outline" size={18} color={brand.primary} />
          <Text style={sh.headerTitle}>Create Ticket Type</Text>
          <TouchableOpacity onPress={handleDismiss} hitSlop={10}>
            <Ionicons name="close" size={20} color={neutral[500]} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={sh.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error && (
            <View style={sh.errorBanner}>
              <Ionicons
                name="alert-circle-outline"
                size={14}
                color={semantic.error}
              />
              <Text style={sh.errorText}>{error}</Text>
            </View>
          )}

          <FieldInput
            label="Ticket Name *"
            value={form.name}
            onChangeText={f("name")}
            placeholder="e.g. Regular, VIP, Early Bird"
            maxLength={80}
          />
          <FieldInput
            label="Description"
            value={form.description}
            onChangeText={f("description")}
            placeholder="What does this ticket include?"
            multiline
          />
          <FieldInput
            label="Perks"
            value={form.perks}
            onChangeText={f("perks")}
            placeholder="e.g. Free drink, VIP entry"
            multiline
          />

          {/* Price + Currency */}
          <View style={sh.twoCol}>
            <View style={{ flex: 1 }}>
              <FieldInput
                label="Price *"
                value={form.price}
                onChangeText={f("price")}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View style={sh.currencyCol}>
              <Text style={sh.fieldLabel}>Currency</Text>
              <View style={sh.currencyRow}>
                {CURRENCIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      sh.currencyPill,
                      form.currency === c && sh.currencyPillActive,
                    ]}
                    onPress={() => setForm((p) => ({ ...p, currency: c }))}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        sh.currencyText,
                        form.currency === c && sh.currencyTextActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <FieldInput
            label="Quantity (blank = unlimited)"
            value={form.quantity}
            onChangeText={f("quantity")}
            placeholder="∞"
            keyboardType="numeric"
          />

          {/* Sale End Date */}
          <DateTimeTrigger
            label="Sale End Date"
            value={saleEndDate}
            onChange={setSaleEndDate}
            hint="Leave blank for no end date"
            minimumDate={new Date()}
          />

          {/* Image */}
          <Text style={[sh.fieldLabel, { marginTop: 8 }]}>Ticket Image</Text>
          <TicketImagePicker
            state={image}
            eventId={eventId}
            onStateChange={setImage}
          />

          {/* Actions */}
          <View style={sh.btnRow}>
            <TouchableOpacity
              style={sh.cancelBtn}
              onPress={handleDismiss}
              activeOpacity={0.7}
            >
              <Text style={sh.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                sh.saveBtn,
                (isLoading || image.status === "uploading") && sh.btnDisabled,
              ]}
              onPress={handleCreate}
              disabled={isLoading || image.status === "uploading"}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size={18} color="#fff" />
              ) : (
                <Text style={sh.saveText}>Create Ticket</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── EditSheet ─────────────────────────────────────────────────────────────────

function EditSheet({
  eventId,
  tier,
  onDismiss,
  onUpdated,
}: {
  eventId: string;
  tier: TicketTier | null;
  onDismiss: () => void;
  onUpdated: (t: TicketTier) => void;
}) {
  const [image, setImage] = useState<ImageUploadState>(fromUrl(tier?.imageUrl));
  const [error, setError] = useState<string | null>(null);
  const [updateTicket, { isLoading }] = useUpdateTicketTierMutation();

  React.useEffect(() => {
    if (tier) setImage(fromUrl(tier.imageUrl));
    setError(null);
  }, [tier?.id]);
  if (!tier) return null;

  const handleSave = async () => {
    if (image.status === "uploading") {
      setError("Wait for upload to finish.");
      return;
    }
    setError(null);
    try {
      const res = await updateTicket({
        eventId,
        ticketId: tier.id,
        ticketData: { imageUrl: image.remoteUrl ?? null },
      }).unwrap();
      if (res?.success && res?.data) {
        onUpdated(res.data);
        onDismiss();
      } else setError("Unexpected response.");
    } catch (e: any) {
      setError(e?.data?.message ?? "Failed to update ticket.");
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={sh.backdrop} />
      <View style={sh.sheet}>
        <View style={sh.header}>
          <Ionicons name="create-outline" size={18} color={brand.primary} />
          <Text style={sh.headerTitle}>Edit Ticket</Text>
          <TouchableOpacity onPress={onDismiss} hitSlop={10}>
            <Ionicons name="close" size={20} color={neutral[500]} />
          </TouchableOpacity>
        </View>
        <ScrollView
          contentContainerStyle={sh.body}
          keyboardShouldPersistTaps="handled"
        >
          <View style={sh.lockBanner}>
            <Ionicons name="lock-closed-outline" size={14} color="#92400e" />
            <Text style={sh.lockText}>
              Only the image can be changed after creation. To edit price or
              quantity, delete and recreate (only if no sales yet).
            </Text>
          </View>
          {error && (
            <View style={sh.errorBanner}>
              <Ionicons
                name="alert-circle-outline"
                size={14}
                color={semantic.error}
              />
              <Text style={sh.errorText}>{error}</Text>
            </View>
          )}
          <FieldInput label="Ticket Name" value={tier.name} disabled />
          <View style={sh.twoCol}>
            <View style={{ flex: 1 }}>
              <FieldInput label="Price" value={String(tier.price)} disabled />
            </View>
            <View style={{ flex: 1 }}>
              <FieldInput
                label="Quantity"
                value={tier.quantity ? String(tier.quantity) : "∞"}
                disabled
              />
            </View>
          </View>
          <View style={sh.soldBox}>
            <Text style={sh.soldText}>
              <Text style={sh.soldCount}>{tier.quantitySold}</Text> ticket
              {tier.quantitySold !== 1 ? "s" : ""} already sold
            </Text>
          </View>
          <Text style={[sh.fieldLabel, { marginBottom: 8 }]}>Ticket Image</Text>
          <TicketImagePicker
            state={image}
            eventId={eventId}
            onStateChange={setImage}
          />
          <View style={sh.btnRow}>
            <TouchableOpacity
              style={sh.cancelBtn}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={sh.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                sh.saveBtn,
                (isLoading || image.status === "uploading") && sh.btnDisabled,
              ]}
              onPress={handleSave}
              disabled={isLoading || image.status === "uploading"}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size={18} color="#fff" />
              ) : (
                <Text style={sh.saveText}>Save Image</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── DeleteModal ───────────────────────────────────────────────────────────────

function DeleteModal({
  tier,
  eventId,
  onDismiss,
  onDeleted,
}: {
  tier: TicketTier | null;
  eventId: string;
  onDismiss: () => void;
  onDeleted: (id: string) => void;
}) {
  const [deleteTicket, { isLoading }] = useDeleteTicketTierMutation();
  if (!tier) return null;
  const hasSales = (tier.quantitySold ?? 0) > 0;

  const handleDelete = async () => {
    if (hasSales) return;
    try {
      await deleteTicket({ eventId, ticketId: tier.id }).unwrap();
      onDeleted(tier.id);
      onDismiss();
    } catch (e: any) {
      Alert.alert("Error", e?.data?.message ?? "Failed to delete.");
    }
  };

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onDismiss}>
      <View style={dm.backdrop} />
      <View style={dm.center}>
        <View style={dm.sheet}>
          <View style={dm.iconRow}>
            <Ionicons name="warning-outline" size={24} color={semantic.error} />
            <Text style={dm.title}>Delete Ticket Type</Text>
          </View>
          <Text style={dm.body}>
            Are you sure you want to delete{" "}
            <Text style={dm.bold}>"{tier.name}"</Text>?
          </Text>
          {hasSales ? (
            <View style={dm.blockBanner}>
              <Ionicons
                name="alert-circle-outline"
                size={14}
                color={semantic.error}
              />
              <Text style={dm.blockText}>
                Cannot delete: {tier.quantitySold} ticket
                {tier.quantitySold !== 1 ? "s have" : " has"} already been sold.
              </Text>
            </View>
          ) : (
            <Text style={dm.warning}>This action cannot be undone.</Text>
          )}
          <View style={dm.btnRow}>
            <TouchableOpacity
              style={dm.cancelBtn}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={dm.cancelText}>Cancel</Text>
            </TouchableOpacity>
            {!hasSales && (
              <TouchableOpacity
                style={[dm.deleteBtn, isLoading && dm.btnDisabled]}
                onPress={handleDelete}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size={18} color="#fff" />
                ) : (
                  <Text style={dm.deleteBtnText}>Delete</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── TicketRow — matches the design image ──────────────────────────────────────

function TicketRow({
  tier,
  onEdit,
  onDelete,
}: {
  tier: TicketTier;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const soldOut = isSoldOut(tier);
  return (
    <View style={[tr.row, soldOut && tr.soldOutRow]}>
      {/* Thumbnail */}
      {tier.imageUrl ? (
        <Image
          source={{ uri: tier.imageUrl }}
          style={tr.thumb}
          resizeMode="cover"
        />
      ) : (
        <View style={tr.thumbPlaceholder}>
          <Ionicons name="ticket-outline" size={20} color={neutral[400]} />
        </View>
      )}

      {/* Info block */}
      <View style={tr.info}>
        {/* Row 1: name + price badge */}
        <View style={tr.nameRow}>
          <Text style={tr.name} numberOfLines={1}>
            {tier.name}
          </Text>
          <View style={[tr.priceBadge, soldOut && tr.soldOutBadge]}>
            <Text style={[tr.priceText, soldOut && tr.soldOutText]}>
              {soldOut ? "SOLD OUT" : formatPrice(tier.price, tier.currency)}
            </Text>
          </View>
        </View>
        {/* Row 2: description */}
        {!!tier.description && (
          <Text style={tr.desc} numberOfLines={1}>
            {tier.description}
          </Text>
        )}
        {/* Row 3: sold / qty */}
        <Text style={tr.sold}>
          {tier.quantitySold}/{tier.quantity ?? "∞"} sold
        </Text>
      </View>

      {/* Action icons — right aligned, icon-only */}
      <View style={tr.actions}>
        <TouchableOpacity onPress={onEdit} hitSlop={8} activeOpacity={0.7}>
          <Ionicons name="pencil-outline" size={19} color={neutral[400]} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={8} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={19} color={semantic.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const tr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[0],
  },
  soldOutRow: {
    borderColor: `${semantic.error}30`,
    backgroundColor: `${semantic.error}04`,
  },
  thumb: { width: 60, height: 60, borderRadius: 10 },
  thumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
    flex: 1,
  },
  priceBadge: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[200],
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: neutral[50],
  },
  soldOutBadge: {
    borderColor: `${semantic.error}40`,
    backgroundColor: `${semantic.error}10`,
  },
  priceText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: neutral[600],
  },
  soldOutText: { color: semantic.error },
  desc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
  },
  sold: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
  actions: { flexDirection: "row", gap: 14, alignItems: "center" },
});

// ─── PayoutStrip ───────────────────────────────────────────────────────────────

function PayoutStrip({ tiers }: { tiers: TicketTier[] }) {
  const totalRevenue = tiers.reduce(
    (s, t) => s + t.price * (t.quantitySold ?? 0),
    0
  );
  const totalSold = tiers.reduce((s, t) => s + (t.quantitySold ?? 0), 0);
  return (
    <View style={ps.wrap}>
      <Text style={ps.title}>Event Earnings</Text>
      <View style={ps.grid}>
        <View style={[ps.box, { backgroundColor: `${semantic.success}12` }]}>
          <Text style={[ps.value, { color: semantic.success }]}>
            {formatPrice(totalRevenue)}
          </Text>
          <Text style={ps.label}>Total Revenue</Text>
        </View>
        <View style={[ps.box, { backgroundColor: `${brand.primary}10` }]}>
          <Text style={[ps.value, { color: brand.primary }]}>{totalSold}</Text>
          <Text style={ps.label}>Tickets Sold</Text>
        </View>
      </View>
    </View>
  );
}

const ps = StyleSheet.create({
  wrap: {
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: neutral[100],
    marginTop: 4,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[700],
  },
  grid: { flexDirection: "row", gap: 10 },
  box: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  value: { fontFamily: fontFamily.extrabold, fontSize: fontSize.xl },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
  },
});

// ─── Sheet shared styles ────────────────────────────────────────────────────────

const sh = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    top: "8%",
    backgroundColor: neutral[0],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  headerTitle: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: neutral[800],
  },
  body: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 40 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: `${semantic.error}40`,
    backgroundColor: `${semantic.error}08`,
  },
  errorText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: semantic.error,
  },
  lockBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f59e0b40",
    backgroundColor: "#fef3c7",
  },
  lockText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: "#92400e",
    lineHeight: 17,
  },
  twoCol: { flexDirection: "row", gap: 12, marginBottom: 4 },
  fieldLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: neutral[700],
    marginBottom: 6,
  },
  currencyCol: { width: 140 },
  currencyRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  currencyPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
  },
  currencyPillActive: {
    borderColor: brand.primary,
    backgroundColor: `${brand.primary}12`,
  },
  currencyText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: neutral[600],
  },
  currencyTextActive: { color: brand.primary },
  soldBox: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: neutral[50],
    borderWidth: 1,
    borderColor: neutral[200],
    marginBottom: 16,
  },
  soldText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
  },
  soldCount: { fontFamily: fontFamily.bold, color: neutral[800] },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 24 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    alignItems: "center",
  },
  cancelText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[600],
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: brand.primary,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  saveText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: "#fff",
  },
});

// ─── Delete modal styles ────────────────────────────────────────────────────────

const dm = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: neutral[0],
    borderRadius: 20,
    padding: 22,
    gap: 12,
  },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: neutral[800],
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[500],
    lineHeight: 20,
  },
  bold: { fontFamily: fontFamily.bold, color: neutral[800] },
  blockBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${semantic.error}40`,
    backgroundColor: `${semantic.error}08`,
  },
  blockText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: semantic.error,
    lineHeight: 16,
  },
  warning: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    alignItems: "center",
  },
  cancelText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[600],
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: semantic.error,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  deleteBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: "#fff",
  },
});

// ─── Main ───────────────────────────────────────────────────────────────────────

export default function TicketManager({
  eventId,
  eventStatus,
}: {
  eventId: string;
  eventStatus?: string;
}) {
  const { data: ticketsResponse, isLoading } = useGetTicketTiersQuery(eventId);
  const serverTiers: TicketTier[] = ticketsResponse?.data ?? [];

  const [tiers, setTiers] = useState<TicketTier[] | null>(null);
  const displayTiers = tiers ?? serverTiers;

  React.useEffect(() => {
    if (serverTiers.length > 0 && tiers === null) setTiers(serverTiers);
  }, [serverTiers]);

  const [showCreate, setShowCreate] = useState(false);
  const [editingTier, setEditingTier] = useState<TicketTier | null>(null);
  const [deletingTier, setDeletingTier] = useState<TicketTier | null>(null);

  const totalRevenue = displayTiers?.reduce(
    (s, t) => s + t.price * (t.quantitySold ?? 0),
    0
  );
  const totalSold = displayTiers?.reduce(
    (s, t) => s + (t.quantitySold ?? 0),
    0
  );

  if (isLoading) {
    return (
      <View style={tm.root}>
        {/* Summary skeleton */}
        <View style={tm.summaryRow}>
          <View style={[tm.summaryBox, { backgroundColor: neutral[100] }]}>
            <View style={tm.summarySkLine} />
            <View style={tm.summarySkLabel} />
          </View>
          <View style={[tm.summaryBox, { backgroundColor: neutral[100] }]}>
            <View style={tm.summarySkLine} />
            <View style={tm.summarySkLabel} />
          </View>
        </View>
        <TicketSkeleton />
      </View>
    );
  }

  return (
    <View style={tm.root}>
      {/* Revenue summary */}
      <View style={tm.summaryRow}>
        <View
          style={[tm.summaryBox, { backgroundColor: `${semantic.success}12` }]}
        >
          <Text style={[tm.summaryValue, { color: semantic.success }]}>
            {formatPrice(totalRevenue)}
          </Text>
          <Text style={tm.summaryLabel}>Total Revenue</Text>
        </View>
        <View
          style={[tm.summaryBox, { backgroundColor: `${brand.primary}10` }]}
        >
          <Text style={[tm.summaryValue, { color: brand.primary }]}>
            {totalSold}
          </Text>
          <Text style={tm.summaryLabel}>Tickets Sold</Text>
        </View>
      </View>

      {/* Add button */}
      <TouchableOpacity
        style={tm.addBtn}
        onPress={() => setShowCreate(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle-outline" size={18} color="#fff" />
        <Text style={tm.addBtnText}>Add Ticket Type</Text>
      </TouchableOpacity>

      {/* Ticket list */}
      {displayTiers?.length > 0 ? (
        <View style={tm.list}>
          {displayTiers?.map((tier) => (
            <TicketRow
              key={tier.id}
              tier={tier}
              onEdit={() => setEditingTier(tier)}
              onDelete={() => setDeletingTier(tier)}
            />
          ))}
        </View>
      ) : (
        <View style={tm.empty}>
          <Ionicons name="ticket-outline" size={32} color={neutral[300]} />
          <Text style={tm.emptyTitle}>No ticket types yet</Text>
          <TouchableOpacity
            style={tm.emptyBtn}
            onPress={() => setShowCreate(true)}
            activeOpacity={0.8}
          >
            <Text style={tm.emptyBtnText}>Create First Ticket</Text>
          </TouchableOpacity>
        </View>
      )}

      {eventStatus === "ENDED" && displayTiers.length > 0 && (
        <PayoutStrip tiers={displayTiers} />
      )}

      <CreateSheet
        eventId={eventId}
        visible={showCreate}
        onDismiss={() => setShowCreate(false)}
        onCreated={(t) => setTiers((p) => [...(p ?? []), t])}
      />
      <EditSheet
        eventId={eventId}
        tier={editingTier}
        onDismiss={() => setEditingTier(null)}
        onUpdated={(t) =>
          setTiers((p) => (p ?? []).map((x) => (x.id === t.id ? t : x)))
        }
      />
      <DeleteModal
        eventId={eventId}
        tier={deletingTier}
        onDismiss={() => setDeletingTier(null)}
        onDeleted={(id) =>
          setTiers((p) => (p ?? []).filter((t) => t.id !== id))
        }
      />
    </View>
  );
}

const tm = StyleSheet.create({
  root: { gap: 14 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  summaryValue: { fontFamily: fontFamily.extrabold, fontSize: fontSize.xl },
  summaryLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
  },
  // skeleton summary
  summarySkLine: {
    width: 60,
    height: 22,
    borderRadius: 6,
    backgroundColor: neutral[200],
  },
  summarySkLabel: {
    width: 50,
    height: 12,
    borderRadius: 4,
    backgroundColor: neutral[200],
    marginTop: 6,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: brand.primary,
    paddingVertical: 13,
    borderRadius: 13,
  },
  addBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: "#fff",
  },
  list: { gap: 10 },
  empty: { alignItems: "center", paddingVertical: 28, gap: 8 },
  emptyTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[500],
  },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: brand.primary,
    backgroundColor: `${brand.primary}08`,
  },
  emptyBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: brand.primary,
  },
});

import { brand, neutral, semantic } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import {
    useGetEventAttendeesQuery,
    useGetEventTicketsQuery,
    useRsvpEventMutation,
} from "@/store/api/eventsApi";
import { useInitiatePurchaseMutation } from "@/store/api/paymentApi";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";
import { EventDetail } from "./types";

// ─── Skeleton primitive ───────────────────────────────────────────────────────

function Bone({ w, h, radius = 8, style = {} }: { w: number | string; h: number; radius?: number; style?: any }) {
  return (
    <View
      style={[
        { width: w as any, height: h, borderRadius: radius, backgroundColor: neutral[100] },
        style,
      ]}
    />
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, avatarUrl, size = 38 }) {
  return (
    <View style={[av.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={[av.text, { fontSize: size * 0.38 }]}>
          {name.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const av = StyleSheet.create({
  circle: { backgroundColor: brand.primary, alignItems: "center", justifyContent: "center" },
  text: { fontFamily: fontFamily.bold, color: "#fff" },
});

// ─── Capacity helper ──────────────────────────────────────────────────────────

function isAtCapacity(tickets) {
  if (!tickets || tickets.length === 0) return false;
  return tickets.every((t) => (t.quantitySold ?? 0) >= (t.quantity ?? Infinity));
}

function formatPrice(price, currency = "NGN") {
  if (price === 0) return "Free";
  const sym = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };
  return `${sym[currency] ?? currency}${Number(price).toLocaleString()}`;
}

// ─── Ticket modal skeletons ───────────────────────────────────────────────────

function TicketSkeleton() {
  return (
    <View style={{ gap: 10 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: neutral[200],
            padding: 14,
            gap: 8,
            backgroundColor: "#fff",
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ gap: 6, flex: 1 }}>
              <Bone w="55%" h={14} />
              <Bone w="38%" h={11} />
              <Bone w="28%" h={11} />
            </View>
            <Bone w={64} h={28} radius={20} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── TicketModal ──────────────────────────────────────────────────────────────

function TicketModal({ visible, eventId, eventName, onDismiss, onConfirmed }) {
  const { data: ticketsRes, isLoading } = useGetEventTicketsQuery(eventId, { skip: !visible });
  const [initiatePurchase, { isLoading: isPurchasing }] = useInitiatePurchaseMutation();

  const tickets = React.useMemo(() => {
    const raw = Array.isArray(ticketsRes?.data)
      ? ticketsRes.data
      : Array.isArray(ticketsRes?.data?.data)
      ? ticketsRes.data.data
      : [];
    return raw.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? "",
      price: Number(t.price),
      currency: t.currency ?? "NGN",
      available: t.quantity != null ? t.quantity - (t.quantitySold ?? 0) : Infinity,
      imageUrl: t.imageUrl ?? null,
    }));
  }, [ticketsRes]);

  const [selectedId, setSelectedId] = useState(null);
  const [quantities, setQuantities] = useState({});

  const selected = tickets.find((t) => t.id === selectedId);
  const qty = selectedId ? (quantities[selectedId] ?? 1) : 1;
  const total = selected ? selected.price * qty : 0;

  const handleDismiss = () => {
    setSelectedId(null);
    setQuantities({});
    onDismiss();
  };

  const handleConfirm = async () => {
    // No tickets configured → free RSVP
    if (!isLoading && tickets.length === 0) {
      onConfirmed(null);
      handleDismiss();
      return;
    }
    if (!selected) {
      Toast.show({ type: "error", text1: "Select a ticket", text2: "Please choose a ticket type to continue." });
      return;
    }
    // Free ticket → RSVP directly
    if (selected.price === 0) {
      onConfirmed(selected.id);
      handleDismiss();
      return;
    }
    // Paid ticket → open Ercaspay in-app browser
    try {
      const res = await initiatePurchase({
        eventId,
        ticketTiers: [{ tierId: selected.id, quantity: qty }],
      }).unwrap();
      handleDismiss();
      // Open payment in in-app browser (FORM_SHEET so user stays in context)
      await WebBrowser.openBrowserAsync(res.data.checkoutUrl, {
        dismissButtonStyle: "close",
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      });
      // When browser closes (payment done or dismissed), optimistically confirm
      onConfirmed(selected.id);
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Payment error",
        text2: err?.data?.message ?? "Could not initiate payment. Please try again.",
      });
    }
  };

  const noTickets = !isLoading && tickets.length === 0;

  const confirmLabel = () => {
    if (noTickets) return "Confirm RSVP";
    if (!selected) return "Select a Ticket";
    if (selected.price === 0) return "Confirm RSVP (Free)";
    return `Pay ${formatPrice(total, selected.currency)}`;
  };

  const confirmIcon = () => {
    if (noTickets || !selected || selected.price === 0) return "checkmark-circle-outline";
    return "card-outline";
  };

  const confirmDisabled = (!noTickets && !selected) || isPurchasing;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleDismiss}>
      <View style={tm.backdrop} />
      <View style={tm.sheet}>
        {/* Header */}
        <View style={tm.header}>
          <View style={tm.headerLeft}>
            <Ionicons name="ticket-outline" size={18} color={brand.primary} />
            <Text style={tm.headerTitle}>Get Tickets</Text>
          </View>
          <TouchableOpacity onPress={handleDismiss} hitSlop={10}>
            <Ionicons name="close" size={22} color={neutral[500]} />
          </TouchableOpacity>
        </View>
        <Text style={tm.headerSub}>
          Choose your ticket for{" "}
          <Text style={tm.headerSubBold}>{eventName}</Text>
        </Text>

        <ScrollView
          contentContainerStyle={tm.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading ? (
            <TicketSkeleton />
          ) : tickets.length === 0 ? (
            <View style={tm.emptyBox}>
              <Ionicons name="ticket-outline" size={36} color={neutral[300]} />
              <Text style={tm.emptyTitle}>No ticket tiers set</Text>
              <Text style={tm.emptySub}>You can still RSVP for free.</Text>
            </View>
          ) : (
            tickets.map((ticket) => {
              const isSelected = selectedId === ticket.id;
              const soldOut = ticket.available <= 0;
              const ticketQty = quantities[ticket.id] ?? 1;

              return (
                <TouchableOpacity
                  key={ticket.id}
                  style={[
                    tm.ticketCard,
                    isSelected && tm.ticketCardSelected,
                    soldOut && tm.ticketCardSoldOut,
                  ]}
                  onPress={() => !soldOut && setSelectedId(isSelected ? null : ticket.id)}
                  activeOpacity={soldOut ? 1 : 0.8}
                  disabled={soldOut}
                >
                  {ticket.imageUrl && (
                    <Image source={{ uri: ticket.imageUrl }} style={tm.ticketImage} resizeMode="cover" />
                  )}
                  <View style={tm.ticketInfo}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={tm.ticketName}>{ticket.name}</Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={15} color={brand.primary} />
                        )}
                      </View>
                      {!!ticket.description && (
                        <Text style={tm.ticketDesc} numberOfLines={1}>{ticket.description}</Text>
                      )}
                      <Text style={[tm.ticketAvail, soldOut && { color: semantic.error }]}>
                        {soldOut ? "Sold out" : ticket.available === Infinity ? "Unlimited" : `${ticket.available} left`}
                      </Text>
                    </View>
                    <View style={[tm.priceBadge, isSelected && tm.priceBadgeSelected]}>
                      <Text style={[tm.priceText, isSelected && { color: brand.primary }]}>
                        {formatPrice(ticket.price, ticket.currency)}
                      </Text>
                    </View>
                  </View>

                  {/* Quantity stepper — paid tickets only */}
                  {isSelected && ticket.price > 0 && (
                    <View style={tm.stepperRow}>
                      <Text style={tm.stepperLabel}>Quantity</Text>
                      <View style={tm.stepper}>
                        <TouchableOpacity
                          style={tm.stepBtn}
                          hitSlop={8}
                          onPress={() => {
                            if (ticketQty === 1) {
                              setSelectedId(null);
                              setQuantities((q) => { const { [ticket.id]: _, ...rest } = q; return rest; });
                            } else {
                              setQuantities((q) => ({ ...q, [ticket.id]: ticketQty - 1 }));
                            }
                          }}
                        >
                          <Ionicons name="remove" size={16} color={neutral[700]} />
                        </TouchableOpacity>
                        <Text style={tm.stepCount}>{ticketQty}</Text>
                        <TouchableOpacity
                          style={[tm.stepBtn, ticketQty >= ticket.available && tm.stepBtnDisabled]}
                          hitSlop={8}
                          disabled={ticketQty >= ticket.available}
                          onPress={() =>
                            setQuantities((q) => ({ ...q, [ticket.id]: Math.min(ticket.available, ticketQty + 1) }))
                          }
                        >
                          <Ionicons name="add" size={16} color={ticketQty >= ticket.available ? neutral[300] : neutral[700]} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Footer */}
        <View style={tm.footer}>
          {selected && selected.price > 0 && (
            <>
              <View style={tm.totalRow}>
                <Text style={tm.totalLabel}>{qty} × {selected.name}</Text>
                <Text style={tm.totalValue}>{formatPrice(total, selected.currency)}</Text>
              </View>
              <View style={tm.paymentNote}>
                <Ionicons name="information-circle-outline" size={14} color="#92400e" />
                <Text style={tm.paymentNoteText}>
                  You'll be redirected to Ercaspay to complete payment securely.
                </Text>
              </View>
            </>
          )}
          <TouchableOpacity
            style={[tm.confirmBtn, confirmDisabled && tm.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={confirmDisabled}
            activeOpacity={0.8}
          >
            {isPurchasing ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Bone w={18} h={18} radius={9} />
                <Text style={tm.confirmBtnText}>Processing…</Text>
              </View>
            ) : (
              <>
                <Ionicons name={confirmIcon()} size={18} color="#fff" />
                <Text style={tm.confirmBtnText}>{confirmLabel()}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Attendee skeleton ────────────────────────────────────────────────────────

function AttendeeSkeleton() {
  return (
    <View style={{ gap: 10 }}>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: neutral[100],
          }}
        >
          <Bone w={38} h={38} radius={19} />
          <View style={{ flex: 1, gap: 6 }}>
            <Bone w="50%" h={13} />
            <Bone w="30%" h={10} />
          </View>
          <Bone w={56} h={24} radius={20} />
        </View>
      ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RsvpTab({ event }: { event: EventDetail }) {
  const router = useRouter();

  const initialStatus =
    event.rsvpStatus === "CONFIRMED" ? "CONFIRMED"
    : event.rsvpStatus === "WAITLIST" ? "WAITLIST"
    : event.rsvpStatus === "CANCELLED" ? "CANCELLED"
    : event.isRsvped ? "CONFIRMED"
    : null;

  const [localStatus, setLocalStatus] = useState(initialStatus);
  const [loadingStatus, setLoadingStatus] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);

  const [rsvpMutation] = useRsvpEventMutation();

  const { data: attendeesRes, isLoading: attendeesLoading } =
    useGetEventAttendeesQuery({ eventId: event.id, limit: 10 });
  const { data: ticketsRes } = useGetEventTicketsQuery(event.id);

  const attendees = attendeesRes?.data?.data ?? [];
  const tickets = Array.isArray(ticketsRes?.data)
    ? ticketsRes.data
    : Array.isArray(ticketsRes?.data?.data)
    ? ticketsRes.data.data
    : [];

  const isFull = isAtCapacity(tickets);

  // ── Post-ticket-selection RSVP ─────────────────────────────────────────────
  const handleTicketConfirmed = async (ticketTierId) => {
    setLoadingStatus("CONFIRMED");
    try {
      await rsvpMutation({
        eventId: event.id,
        status: "CONFIRMED",
        ...(ticketTierId ? { ticketTierId } : {}),
      }).unwrap();
      setLocalStatus("CONFIRMED");
      Toast.show({ type: "success", text1: "You're going! 🎉", text2: "RSVP confirmed successfully", visibilityTime: 2500 });
    } catch (err) {
      const msg = err?.data?.message ?? "Could not confirm RSVP. Please try again.";
      if (
        msg.toLowerCase().includes("capacity") ||
        msg.toLowerCase().includes("full") ||
        msg.toLowerCase().includes("waitlist")
      ) {
        setLocalStatus("WAITLIST");
        Toast.show({ type: "info", text1: "Added to waitlist ⏳", text2: "We'll notify you if a spot opens", visibilityTime: 2500 });
      } else {
        Toast.show({ type: "error", text1: "RSVP failed", text2: msg, visibilityTime: 3000 });
      }
    } finally {
      setLoadingStatus(null);
    }
  };

  // ── Waitlist / Cancel ──────────────────────────────────────────────────────
  const handleSimpleRsvp = async (status) => {
    if (loadingStatus) return;
    const next = localStatus === status ? "CANCELLED" : status;
    setLoadingStatus(status);
    try {
      await rsvpMutation({ eventId: event.id, status: next }).unwrap();
      setLocalStatus(next);
      const messages = {
        WAITLIST: { text1: "Added to waitlist ⏳", text2: "We'll notify you if a spot opens" },
        CANCELLED: { text1: "RSVP cancelled", text2: "You've been removed from the list" },
      };
      Toast.show({ type: "success", ...(messages[next] ?? { text1: "Done", text2: "" }), visibilityTime: 2500 });
    } catch (err) {
      Toast.show({ type: "error", text1: "Failed", text2: err?.data?.message ?? "Please try again.", visibilityTime: 3000 });
    } finally {
      setLoadingStatus(null);
    }
  };

  // ── Going tapped ───────────────────────────────────────────────────────────
  const handleGoing = () => {
    if (loadingStatus || localStatus === "CONFIRMED") return;
    if (isFull) {
      handleSimpleRsvp("WAITLIST");
      return;
    }
    setShowTicketModal(true);
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.wrap} showsVerticalScrollIndicator={false}>

      {/* ── Status banner ─────────────────────────────────────────────────── */}
      {localStatus && localStatus !== "CANCELLED" && (
        <View
          style={[
            s.banner,
            {
              backgroundColor: localStatus === "CONFIRMED" ? `${semantic.success}18` : `${semantic.warning}18`,
              borderColor: localStatus === "CONFIRMED" ? `${semantic.success}40` : `${semantic.warning}40`,
            },
          ]}
        >
          <View style={[s.bannerIconWrap, { backgroundColor: localStatus === "CONFIRMED" ? semantic.success : semantic.warning }]}>
            <Ionicons name={localStatus === "CONFIRMED" ? "ticket-outline" : "time-outline"} size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.bannerTitle, { color: localStatus === "CONFIRMED" ? semantic.success : semantic.warning }]}>
              {localStatus === "CONFIRMED" ? "You're going! 🎉" : "You're on the waitlist ⏳"}
            </Text>
            <Text style={s.bannerSub}>
              {localStatus === "CONFIRMED" ? "Your RSVP is confirmed" : "We'll notify you if a spot opens"}
            </Text>
          </View>
          <View
            style={[
              s.bannerPill,
              {
                borderColor: localStatus === "CONFIRMED" ? `${semantic.success}60` : `${semantic.warning}60`,
                backgroundColor: localStatus === "CONFIRMED" ? `${semantic.success}25` : `${semantic.warning}25`,
              },
            ]}
          >
            <Text style={[s.bannerPillText, { color: localStatus === "CONFIRMED" ? semantic.success : semantic.warning }]}>
              {localStatus === "CONFIRMED" ? "Confirmed" : "Waitlisted"}
            </Text>
          </View>
        </View>
      )}

      {/* ── Capacity warning ──────────────────────────────────────────────── */}
      {isFull && !localStatus && (
        <View style={s.capacityBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={semantic.error} />
          <Text style={s.capacityText}>This event is at capacity. You can join the waitlist.</Text>
        </View>
      )}

      {/* ── RSVP buttons ──────────────────────────────────────────────────── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Your RSVP</Text>
        <View style={s.btnRow}>
          {/* Going */}
          <TouchableOpacity
            style={[
              s.rsvpBtn,
              {
                backgroundColor:
                  localStatus === "CONFIRMED" ? `${semantic.success}18`
                  : isFull ? `${semantic.warning}10`
                  : neutral[50],
                borderColor:
                  localStatus === "CONFIRMED" ? semantic.success
                  : isFull ? semantic.warning
                  : neutral[200],
                opacity: loadingStatus && loadingStatus !== "CONFIRMED" ? 0.4 : 1,
              },
            ]}
            onPress={handleGoing}
            activeOpacity={0.8}
            disabled={!!loadingStatus || localStatus === "CONFIRMED"}
          >
            {loadingStatus === "CONFIRMED" ? (
              // Skeleton pulse on button while loading
              <View style={{ alignItems: "center", gap: 6 }}>
                <Bone w={22} h={22} radius={11} />
                <Bone w={40} h={10} />
              </View>
            ) : (
              <>
                <Ionicons
                  name={isFull && !localStatus ? "time-outline" : "checkmark-circle-outline"}
                  size={22}
                  color={localStatus === "CONFIRMED" ? semantic.success : isFull ? semantic.warning : neutral[400]}
                />
                <Text style={[s.rsvpLabel, { color: localStatus === "CONFIRMED" ? semantic.success : isFull ? semantic.warning : neutral[500] }]}>
                  {isFull && !localStatus ? "Join Waitlist" : localStatus === "CONFIRMED" ? "Going ✓" : "Going"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Waitlist */}
          <TouchableOpacity
            style={[
              s.rsvpBtn,
              {
                backgroundColor: localStatus === "WAITLIST" ? `${semantic.warning}18` : neutral[50],
                borderColor: localStatus === "WAITLIST" ? semantic.warning : neutral[200],
                opacity: loadingStatus && loadingStatus !== "WAITLIST" ? 0.4 : 1,
              },
            ]}
            onPress={() => handleSimpleRsvp("WAITLIST")}
            activeOpacity={0.8}
            disabled={!!loadingStatus || localStatus === "CONFIRMED" || localStatus === "WAITLIST"}
          >
            {loadingStatus === "WAITLIST" ? (
              <View style={{ alignItems: "center", gap: 6 }}>
                <Bone w={22} h={22} radius={11} />
                <Bone w={40} h={10} />
              </View>
            ) : (
              <>
                <Ionicons name="time-outline" size={22} color={localStatus === "WAITLIST" ? semantic.warning : neutral[400]} />
                <Text style={[s.rsvpLabel, { color: localStatus === "WAITLIST" ? semantic.warning : neutral[500] }]}>Waitlist</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Can't Go */}
          <TouchableOpacity
            style={[
              s.rsvpBtn,
              {
                backgroundColor: localStatus === "CANCELLED" ? `${semantic.error}18` : neutral[50],
                borderColor: localStatus === "CANCELLED" ? semantic.error : neutral[200],
                opacity: loadingStatus && loadingStatus !== "CANCELLED" ? 0.4 : 1,
              },
            ]}
            onPress={() => handleSimpleRsvp("CANCELLED")}
            activeOpacity={0.8}
            disabled={!!loadingStatus || localStatus === "CANCELLED"}
          >
            {loadingStatus === "CANCELLED" ? (
              <View style={{ alignItems: "center", gap: 6 }}>
                <Bone w={22} h={22} radius={11} />
                <Bone w={40} h={10} />
              </View>
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={22} color={localStatus === "CANCELLED" ? semantic.error : neutral[400]} />
                <Text style={[s.rsvpLabel, { color: localStatus === "CANCELLED" ? semantic.error : neutral[500] }]}>Can't Go</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Who's going ───────────────────────────────────────────────────── */}
      <View style={s.section}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={s.sectionTitle}>Who's Going</Text>
          {attendeesRes?.data?.meta?.total != null && (
            <Text style={s.attendeeCount}>{attendeesRes.data.meta.total} attending</Text>
          )}
        </View>

        {attendeesLoading ? (
          <AttendeeSkeleton />
        ) : attendees.length === 0 ? (
          <View style={s.emptyRow}>
            <Ionicons name="people-outline" size={28} color={neutral[300]} />
            <Text style={s.emptyText}>No attendees yet — be the first!</Text>
          </View>
        ) : (
          <View style={s.attendeesCard}>
            {attendees.map((a, idx) => {
              const name = a?.user?.displayName ?? a?.user?.username ?? "User";
              const confirmed = a?.status === "CONFIRMED" || a.checkedIn;
              return (
                <TouchableOpacity
                  key={a.userId}
                  style={[s.attendeeRow, idx === 0 && { borderTopWidth: 0 }]}
                  onPress={() => a.userId && router.push(`/users/${a.userId}` as any)}
                  activeOpacity={0.8}
                >
                  <Avatar name={name} avatarUrl={a?.user?.avatarUrl} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.attendeeName}>{name}</Text>
                    {a?.user?.username && (
                      <Text style={s.attendeeHandle}>@{a.user.username}</Text>
                    )}
                  </View>
                  <View style={[s.statusPill, { backgroundColor: confirmed ? `${semantic.success}18` : `${semantic.warning}18` }]}>
                    <Text style={[s.statusText, { color: confirmed ? semantic.success : semantic.warning }]}>
                      {confirmed ? "Going" : "Waitlist"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Ticket modal — shown only when user taps Going ────────────────── */}
      <TicketModal
        visible={showTicketModal}
        eventId={event.id}
        eventName={event.name}
        onDismiss={() => setShowTicketModal(false)}
        onConfirmed={handleTicketConfirmed}
      />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 20 },

  banner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  bannerIconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  bannerTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, marginBottom: 2 },
  bannerSub: { fontFamily: fontFamily.regular, fontSize: 12, color: neutral[500] },
  bannerPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  bannerPillText: { fontFamily: fontFamily.bold, fontSize: 12 },

  capacityBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${semantic.error}30`,
    backgroundColor: `${semantic.error}08`,
  },
  capacityText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: semantic.error },

  section: { gap: 10 },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: neutral[800] },

  btnRow: { flexDirection: "row", gap: 10 },
  rsvpBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    minHeight: 72,
  },
  rsvpLabel: { fontFamily: fontFamily.semibold, fontSize: 11 },

  attendeeCount: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[400] },
  attendeesCard: { gap: 10 },
  emptyRow: { alignItems: "center", justifyContent: "center", paddingVertical: 24, gap: 8 },
  emptyText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400] },
  attendeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: neutral[100],
  },
  attendeeName: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  attendeeHandle: { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[500] },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontFamily: fontFamily.semibold, fontSize: 11 },
});

// ─── TicketModal styles ───────────────────────────────────────────────────────

const tm = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    top: "12%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.md, color: neutral[800] },
  headerSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[100],
  },
  headerSubBold: { fontFamily: fontFamily.semibold, color: neutral[800] },
  body: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 10 },

  emptyBox: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[600] },
  emptySub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[400] },

  ticketCard: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: neutral[200],
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  ticketCardSelected: { borderColor: brand.primary },
  ticketCardSoldOut: { opacity: 0.5 },
  ticketImage: { width: "100%", height: 120 },
  ticketInfo: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  ticketName: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[800] },
  ticketDesc: { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[500] },
  ticketAvail: { fontFamily: fontFamily.regular, fontSize: 11, color: neutral[400] },
  priceBadge: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[200],
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: neutral[50],
  },
  priceBadgeSelected: { backgroundColor: `${brand.primary}15`, borderColor: brand.primary },
  priceText: { fontFamily: fontFamily.bold, fontSize: fontSize.xs, color: neutral[700] },

  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: neutral[100],
  },
  stepperLabel: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[500] },
  stepper: { flexDirection: "row", alignItems: "center", gap: 16 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnDisabled: { opacity: 0.4 },
  stepCount: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: neutral[800], minWidth: 20, textAlign: "center" },

  footer: {
    padding: 16,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: neutral[100],
    backgroundColor: "#fff",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: neutral[50],
  },
  totalLabel: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[500] },
  totalValue: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: neutral[800] },
  paymentNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f59e0b40",
    backgroundColor: "#fef3c7",
  },
  paymentNoteText: { flex: 1, fontFamily: fontFamily.regular, fontSize: 11, color: "#92400e", lineHeight: 16 },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: brand.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmBtnDisabled: { opacity: 0.45 },
  confirmBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: "#fff" },
});

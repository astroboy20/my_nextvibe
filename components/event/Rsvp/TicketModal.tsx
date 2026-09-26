import { brand, neutral, semantic } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useCardCheckout } from "@/hooks/useCardCheckout";
import { isStripeCurrency } from "@/lib/stripe";
import {
  useGetEventTicketsQuery
} from "@/store/api/eventsApi";
import { useInitiatePurchaseMutation } from "@/store/api/paymentApi";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useMemo, useState } from "react";
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
import { formatPrice } from "./helper";
import { Bone, TicketSkeleton } from "./Skeleton";

interface TicketProps {
  visible?: any;
  eventId: string;
  eventName: string;
  onDismiss?: any;
  onConfirmed?: any;
}

const TicketModal = ({
  visible,
  eventId,
  eventName,
  onDismiss,
  onConfirmed,
}: TicketProps) => {
  const router = useRouter();
  const { data: ticketsRes, isLoading } = useGetEventTicketsQuery(eventId, {
    skip: !visible,
  });
  const [initiatePurchase, { isLoading: isPurchasing }] =
    useInitiatePurchaseMutation();
  const { pay, busy } = useCardCheckout();

  const tickets = useMemo(() => {
    const raw = Array.isArray(ticketsRes?.data)
      ? ticketsRes.data
      : Array.isArray(ticketsRes?.data?.data)
      ? ticketsRes.data.data
      : [];
    return raw.map((ticket: any) => ({
      id: ticket.id,
      name: ticket.name,
      description: ticket.description ?? "",
      price: Number(ticket.price),
      currency: ticket.currency ?? "NGN",
      available:
        ticket.quantity != null
          ? ticket.quantity - (ticket.quantitySold ?? 0)
          : Infinity,
      imageUrl: ticket.imageUrl ?? null,
    }));
  }, [ticketsRes]);

  const [selectedId, setSelectedId] = useState(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const selected = tickets.find((ticket: any) => ticket.id === selectedId);
  const qty = selectedId ? quantities[selectedId] ?? 1 : 1;
  const total = selected ? selected.price * qty : 0;

  const handleDismiss = () => {
    setSelectedId(null);
    setQuantities({});
    onDismiss();
  };

  const handleConfirm = async () => {
    if (!isLoading && tickets.length === 0) {
      onConfirmed(null);
      handleDismiss();
      return;
    }
    if (!selected) {
      Toast.show({
        type: "error",
        text1: "Select a ticket",
        text2: "Please choose a ticket type to continue.",
      });
      return;
    }

    if (selected.price === 0) {
      onConfirmed(selected.id);
      handleDismiss();
      return;
    }

    // ── Stripe path (USD / GBP / EUR / CAD) ──────────────────────────────────
    if (isStripeCurrency(selected.currency)) {
      const outcome = await pay({
        eventId,
        tierId: selected.id,
        quantity: qty,
      });

      if (outcome.outcome === "success") {
        handleDismiss();
        router.push(`/purchase-confirmation?purchaseId=${outcome.purchaseId}` as any);
      } else if (outcome.outcome === "cancelled") {
        // Silent — user dismissed the sheet intentionally
      } else if (outcome.outcome === "error") {
        Toast.show({
          type: "error",
          text1: "Payment failed",
          text2: outcome.message,
        });
      } else if (outcome.outcome === "processing") {
        Toast.show({
          type: "info",
          text1: "Payment processing",
          text2: "Check your purchase history for confirmation.",
        });
      }
      return;
    }

    // ── Bachs/Ercaspay path (NGN and all other currencies) ───────────────────
    try {
      const res = await initiatePurchase({
        eventId,
        ticketTiers: [{ tierId: selected.id, quantity: qty }],
      }).unwrap();
      handleDismiss();
      await WebBrowser.openBrowserAsync(res.data.checkoutUrl, {
        dismissButtonStyle: "close",
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      });
      onConfirmed(selected.id);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Payment error",
        text2:
          err?.data?.message ?? "Could not initiate payment. Please try again.",
      });
    }
  };

  const noTickets = !isLoading && tickets.length === 0;

  const confirmLabel = () => {
    if (noTickets) return "Confirm RSVP";
    if (!selected) return "Select a Ticket";
    if (selected.price === 0) return "Confirm RSVP (Free)";
    if (isStripeCurrency(selected.currency)) return "Pay with Card";
    return `Pay ${formatPrice(total, selected.currency)}`;
  };

  const confirmIcon = () => {
    if (noTickets || !selected || selected.price === 0)
      return "checkmark-circle-outline";
    if (isStripeCurrency(selected.currency)) return "card-outline";
    return "card-outline";
  };

  const confirmDisabled = (!noTickets && !selected) || isPurchasing || busy;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleDismiss}
    >
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
            tickets.map((ticket: any) => {
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
                  onPress={() =>
                    !soldOut && setSelectedId(isSelected ? null : ticket.id)
                  }
                  activeOpacity={soldOut ? 1 : 0.8}
                  disabled={soldOut}
                >
                  {ticket.imageUrl && (
                    <Image
                      source={{ uri: ticket.imageUrl }}
                      style={tm.ticketImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={tm.ticketInfo}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Text style={tm.ticketName}>{ticket.name}</Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={15}
                            color={brand.primary}
                          />
                        )}
                      </View>
                      {!!ticket.description && (
                        <Text style={tm.ticketDesc} numberOfLines={1}>
                          {ticket.description}
                        </Text>
                      )}
                      <Text
                        style={[
                          tm.ticketAvail,
                          soldOut && { color: semantic.error },
                        ]}
                      >
                        {soldOut
                          ? "Sold out"
                          : ticket.available === Infinity
                          ? "Unlimited"
                          : `${ticket.available} left`}
                      </Text>
                    </View>
                    <View
                      style={[
                        tm.priceBadge,
                        isSelected && tm.priceBadgeSelected,
                      ]}
                    >
                      <Text
                        style={[
                          tm.priceText,
                          isSelected && { color: brand.primary },
                        ]}
                      >
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
                              setQuantities((q) => {
                                const { [ticket.id]: _, ...rest } = q;
                                return rest;
                              });
                            } else {
                              setQuantities((q) => ({
                                ...q,
                                [ticket.id]: ticketQty - 1,
                              }));
                            }
                          }}
                        >
                          <Ionicons
                            name="remove"
                            size={16}
                            color={neutral[700]}
                          />
                        </TouchableOpacity>
                        <Text style={tm.stepCount}>{ticketQty}</Text>
                        <TouchableOpacity
                          style={[
                            tm.stepBtn,
                            ticketQty >= ticket.available && tm.stepBtnDisabled,
                          ]}
                          hitSlop={8}
                          disabled={ticketQty >= ticket.available}
                          onPress={() =>
                            setQuantities((q) => ({
                              ...q,
                              [ticket.id]: Math.min(
                                ticket.available,
                                ticketQty + 1
                              ),
                            }))
                          }
                        >
                          <Ionicons
                            name="add"
                            size={16}
                            color={
                              ticketQty >= ticket.available
                                ? neutral[300]
                                : neutral[700]
                            }
                          />
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
                <Text style={tm.totalLabel}>
                  {qty} × {selected.name}
                </Text>
                <Text style={tm.totalValue}>
                  {formatPrice(total, selected.currency)}
                </Text>
              </View>
              {isStripeCurrency(selected.currency) ? (
                <View style={tm.paymentNoteStripe}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={14}
                    color="#1d4ed8"
                  />
                  <Text style={tm.paymentNoteStripeText}>
                    Secured by Stripe. Your card details are encrypted.
                  </Text>
                </View>
              ) : (
                <View style={tm.paymentNote}>
                  <Ionicons
                    name="information-circle-outline"
                    size={14}
                    color="#92400e"
                  />
                  <Text style={tm.paymentNoteText}>
                    You'll be redirected to Ercaspay to complete payment securely.
                  </Text>
                </View>
              )}
            </>
          )}
          <TouchableOpacity
            style={[tm.confirmBtn, confirmDisabled && tm.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={confirmDisabled}
            activeOpacity={0.8}
          >
            {isPurchasing || busy ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
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
};

export default TicketModal;

// ─── TicketModal styles ───────────────────────────────────────────────────────

const tm = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
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
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: neutral[800],
  },
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
  emptyTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[600],
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },

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
  ticketInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  ticketName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  ticketDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: neutral[500],
  },
  ticketAvail: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: neutral[400],
  },
  priceBadge: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[200],
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: neutral[50],
  },
  priceBadgeSelected: {
    backgroundColor: `${brand.primary}15`,
    borderColor: brand.primary,
  },
  priceText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: neutral[700],
  },

  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: neutral[100],
  },
  stepperLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
  },
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
  stepCount: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: neutral[800],
    minWidth: 20,
    textAlign: "center",
  },

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
  totalLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
  },
  totalValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
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
  paymentNoteText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: "#92400e",
    lineHeight: 16,
  },
  paymentNoteStripe: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#93c5fd40",
    backgroundColor: "#eff6ff",
  },
  paymentNoteStripeText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: "#1d4ed8",
    lineHeight: 16,
  },
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
  confirmBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: "#fff",
  },
});

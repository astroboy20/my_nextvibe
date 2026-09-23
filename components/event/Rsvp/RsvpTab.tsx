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
import { EventDetail } from "../types";
import { isAtCapacity } from "./helper";
import { AttendeeSkeleton, Bone } from "./Skeleton";
import Avatar from "./Avatar";
import TicketModal from "./TicketModal";

// ─── Main component ───────────────────────────────────────────────────────────

export default function RsvpTab({ event }: { event: EventDetail }) {
  const router = useRouter();

  const initialStatus =
    event.rsvpStatus === "CONFIRMED"
      ? "CONFIRMED"
      : event.rsvpStatus === "WAITLIST"
      ? "WAITLIST"
      : event.rsvpStatus === "CANCELLED"
      ? "CANCELLED"
      : event.isRsvped
      ? "CONFIRMED"
      : null;

  const [localStatus, setLocalStatus] = useState(initialStatus);
  const [loadingStatus, setLoadingStatus] = useState<
    "CONFIRMED" | "WAITLIST" | "CANCELLED" | null
  >(null);
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
  const handleTicketConfirmed = async (ticketTierId: any) => {
    setLoadingStatus("CONFIRMED");
    try {
      await rsvpMutation({
        eventId: event.id,
        status: "CONFIRMED",
        ...(ticketTierId ? { ticketTierId } : {}),
      }).unwrap();
      setLocalStatus("CONFIRMED");
      Toast.show({
        type: "success",
        text1: "You're going! 🎉",
        text2: "RSVP confirmed successfully",
        visibilityTime: 2500,
      });
    } catch (err: any) {
      const msg =
        err?.data?.message ?? "Could not confirm RSVP. Please try again.";
      if (
        msg.toLowerCase().includes("capacity") ||
        msg.toLowerCase().includes("full") ||
        msg.toLowerCase().includes("waitlist")
      ) {
        setLocalStatus("WAITLIST");
        Toast.show({
          type: "info",
          text1: "Added to waitlist ⏳",
          text2: "We'll notify you if a spot opens",
          visibilityTime: 2500,
        });
      } else {
        Toast.show({
          type: "error",
          text1: "RSVP failed",
          text2: msg,
          visibilityTime: 3000,
        });
      }
    } finally {
      setLoadingStatus(null);
    }
  };

  // ── Waitlist / Cancel ──────────────────────────────────────────────────────
  const handleSimpleRsvp = async (
    status: "CONFIRMED" | "WAITLIST" | "CANCELLED"
  ) => {
    if (loadingStatus) return;
    const next = localStatus === status ? "CANCELLED" : status;
    setLoadingStatus(status);
    try {
      await rsvpMutation({ eventId: event.id, status: next }).unwrap();
      setLocalStatus(next);
      const messages = {
        WAITLIST: {
          text1: "Added to waitlist ⏳",
          text2: "We'll notify you if a spot opens",
        },
        CANCELLED: {
          text1: "RSVP cancelled",
          text2: "You've been removed from the list",
        },
        CONFIRMED: {
          text1: "RSVP confirmed",
          text2: "You're all set!",
        },
      };
      Toast.show({
        type: "success",
        ...(messages[next] ?? { text1: "Done", text2: "" }),
        visibilityTime: 2500,
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Failed",
        text2: err?.data?.message ?? "Please try again.",
        visibilityTime: 3000,
      });
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
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={s.wrap}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Status banner ─────────────────────────────────────────────────── */}
      {localStatus && localStatus !== "CANCELLED" && (
        <View
          style={[
            s.banner,
            {
              backgroundColor:
                localStatus === "CONFIRMED"
                  ? `${semantic.success}18`
                  : `${semantic.warning}18`,
              borderColor:
                localStatus === "CONFIRMED"
                  ? `${semantic.success}40`
                  : `${semantic.warning}40`,
            },
          ]}
        >
          <View
            style={[
              s.bannerIconWrap,
              {
                backgroundColor:
                  localStatus === "CONFIRMED"
                    ? semantic.success
                    : semantic.warning,
              },
            ]}
          >
            <Ionicons
              name={
                localStatus === "CONFIRMED" ? "ticket-outline" : "time-outline"
              }
              size={20}
              color="#fff"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                s.bannerTitle,
                {
                  color:
                    localStatus === "CONFIRMED"
                      ? semantic.success
                      : semantic.warning,
                },
              ]}
            >
              {localStatus === "CONFIRMED"
                ? "You're going! 🎉"
                : "You're on the waitlist ⏳"}
            </Text>
            <Text style={s.bannerSub}>
              {localStatus === "CONFIRMED"
                ? "Your RSVP is confirmed"
                : "We'll notify you if a spot opens"}
            </Text>
          </View>
          <View
            style={[
              s.bannerPill,
              {
                borderColor:
                  localStatus === "CONFIRMED"
                    ? `${semantic.success}60`
                    : `${semantic.warning}60`,
                backgroundColor:
                  localStatus === "CONFIRMED"
                    ? `${semantic.success}25`
                    : `${semantic.warning}25`,
              },
            ]}
          >
            <Text
              style={[
                s.bannerPillText,
                {
                  color:
                    localStatus === "CONFIRMED"
                      ? semantic.success
                      : semantic.warning,
                },
              ]}
            >
              {localStatus === "CONFIRMED" ? "Confirmed" : "Waitlisted"}
            </Text>
          </View>
        </View>
      )}

      {/* ── Capacity warning ──────────────────────────────────────────────── */}
      {isFull && !localStatus && (
        <View style={s.capacityBanner}>
          <Ionicons
            name="alert-circle-outline"
            size={16}
            color={semantic.error}
          />
          <Text style={s.capacityText}>
            This event is at capacity. You can join the waitlist.
          </Text>
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
                  localStatus === "CONFIRMED"
                    ? `${semantic.success}18`
                    : isFull
                    ? `${semantic.warning}10`
                    : neutral[50],
                borderColor:
                  localStatus === "CONFIRMED"
                    ? semantic.success
                    : isFull
                    ? semantic.warning
                    : neutral[200],
                opacity:
                  loadingStatus && loadingStatus !== "CONFIRMED" ? 0.4 : 1,
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
                  name={
                    isFull && !localStatus
                      ? "time-outline"
                      : "checkmark-circle-outline"
                  }
                  size={22}
                  color={
                    localStatus === "CONFIRMED"
                      ? semantic.success
                      : isFull
                      ? semantic.warning
                      : neutral[400]
                  }
                />
                <Text
                  style={[
                    s.rsvpLabel,
                    {
                      color:
                        localStatus === "CONFIRMED"
                          ? semantic.success
                          : isFull
                          ? semantic.warning
                          : neutral[500],
                    },
                  ]}
                >
                  {isFull && !localStatus
                    ? "Join Waitlist"
                    : localStatus === "CONFIRMED"
                    ? "Going ✓"
                    : "Going"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Waitlist */}
          <TouchableOpacity
            style={[
              s.rsvpBtn,
              {
                backgroundColor:
                  localStatus === "WAITLIST"
                    ? `${semantic.warning}18`
                    : neutral[50],
                borderColor:
                  localStatus === "WAITLIST" ? semantic.warning : neutral[200],
                opacity:
                  loadingStatus && loadingStatus !== "WAITLIST" ? 0.4 : 1,
              },
            ]}
            onPress={() => handleSimpleRsvp("WAITLIST")}
            activeOpacity={0.8}
            disabled={
              !!loadingStatus ||
              localStatus === "CONFIRMED" ||
              localStatus === "WAITLIST"
            }
          >
            {loadingStatus === "WAITLIST" ? (
              <View style={{ alignItems: "center", gap: 6 }}>
                <Bone w={22} h={22} radius={11} />
                <Bone w={40} h={10} />
              </View>
            ) : (
              <>
                <Ionicons
                  name="time-outline"
                  size={22}
                  color={
                    localStatus === "WAITLIST" ? semantic.warning : neutral[400]
                  }
                />
                <Text
                  style={[
                    s.rsvpLabel,
                    {
                      color:
                        localStatus === "WAITLIST"
                          ? semantic.warning
                          : neutral[500],
                    },
                  ]}
                >
                  Waitlist
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Can't Go */}
          <TouchableOpacity
            style={[
              s.rsvpBtn,
              {
                backgroundColor:
                  localStatus === "CANCELLED"
                    ? `${semantic.error}18`
                    : neutral[50],
                borderColor:
                  localStatus === "CANCELLED" ? semantic.error : neutral[200],
                opacity:
                  loadingStatus && loadingStatus !== "CANCELLED" ? 0.4 : 1,
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
                <Ionicons
                  name="close-circle-outline"
                  size={22}
                  color={
                    localStatus === "CANCELLED" ? semantic.error : neutral[400]
                  }
                />
                <Text
                  style={[
                    s.rsvpLabel,
                    {
                      color:
                        localStatus === "CANCELLED"
                          ? semantic.error
                          : neutral[500],
                    },
                  ]}
                >
                  Can't Go
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Who's going ───────────────────────────────────────────────────── */}
      <View style={s.section}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={s.sectionTitle}>Who's Going</Text>
          {attendeesRes?.data?.meta?.total != null && (
            <Text style={s.attendeeCount}>
              {attendeesRes.data.meta.total} attending
            </Text>
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
            {attendees.map((attendee: any, idx: number) => {
              const name =
                attendee?.user?.displayName ??
                attendee?.user?.username ??
                "User";
              const confirmed =
                attendee?.status === "CONFIRMED" || attendee.checkedIn;
              return (
                <TouchableOpacity
                  key={attendee.userId}
                  style={[s.attendeeRow, idx === 0 && { borderTopWidth: 0 }]}
                  onPress={() =>
                    attendee.userId &&
                    router.push(`/users/${attendee.userId}` as any)
                  }
                  activeOpacity={0.8}
                >
                  <Avatar
                    name={name}
                    avatarUrl={attendee?.user?.avatarUrl}
                    size={38}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.attendeeName}>{name}</Text>
                    {attendee?.user?.username && (
                      <Text style={s.attendeeHandle}>
                        @{attendee.user.username}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      s.statusPill,
                      {
                        backgroundColor: confirmed
                          ? `${semantic.success}18`
                          : `${semantic.warning}18`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.statusText,
                        {
                          color: confirmed
                            ? semantic.success
                            : semantic.warning,
                        },
                      ]}
                    >
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

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  bannerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    marginBottom: 2,
  },
  bannerSub: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: neutral[500],
  },
  bannerPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
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
  capacityText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: semantic.error,
  },

  section: { gap: 10 },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },

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

  attendeeCount: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
  },
  attendeesCard: { gap: 10 },
  emptyRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
  },
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
  attendeeName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  attendeeHandle: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: neutral[500],
  },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontFamily: fontFamily.semibold, fontSize: 11 },
});

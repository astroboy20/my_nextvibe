import { brand, neutral, semantic } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import {
    useGetEventAttendeesQuery,
    useGetEventTicketsQuery,
    useRsvpEventMutation,
} from "@/store/api/eventsApi";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import type { EventDetail } from "./types";
import Toast from "react-native-toast-message";

// ─── Types ────────────────────────────────────────────────────────────────────

type RsvpStatus = "CONFIRMED" | "WAITLIST" | "CANCELLED" | null;

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  name,
  avatarUrl,
  size = 38,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  return (
    <View
      style={[av.circle, { width: size, height: size, borderRadius: size / 2 }]}
    >
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
  circle: {
    backgroundColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontFamily: fontFamily.bold, color: "#fff" },
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  event: EventDetail;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RsvpTab({ event }: Props) {
  // Derive initial status from event data
  const initialStatus: RsvpStatus =
    event.rsvpStatus === "CONFIRMED"
      ? "CONFIRMED"
      : event.rsvpStatus === "WAITLIST"
      ? "WAITLIST"
      : event.rsvpStatus === "CANCELLED"
      ? "CANCELLED"
      : event.isRsvped
      ? "CONFIRMED"
      : null;

  const [localStatus, setLocalStatus] = useState<RsvpStatus>(initialStatus);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<RsvpStatus>(null);

  const [rsvpMutation] = useRsvpEventMutation();

  const { data: attendeesRes, isLoading: attendeesLoading } =
    useGetEventAttendeesQuery({ eventId: event.id, limit: 10 });

  const { data: ticketsRes, isLoading: ticketsLoading } =
    useGetEventTicketsQuery(event.id);
  console.log(attendeesRes, "attendeesRes");
  const attendees = attendeesRes ? attendeesRes?.data?.data : [];
  const tickets = Array.isArray(ticketsRes?.data)
    ? ticketsRes.data
    : Array.isArray((ticketsRes?.data as any)?.data)
    ? (ticketsRes?.data as any).data
    : [];
  const hasPaidTickets = tickets.some((t) => t.price > 0);

  // ── RSVP handler ────────────────────────────────────────────────────────────
  async function handleRsvp(status: NonNullable<RsvpStatus>) {
    if (loadingStatus) return;
    // If already this status, treat as cancel
    const nextStatus: NonNullable<RsvpStatus> =
      localStatus === status ? "CANCELLED" : status;

    setLoadingStatus(status);
    try {
      await rsvpMutation({
        eventId: event.id,
        status: nextStatus,
        ...(selectedTicketId ? { ticketTierId: selectedTicketId } : {}),
      }).unwrap();
      setLocalStatus(nextStatus);

      const messages: Record<NonNullable<RsvpStatus>, { text1: string; text2: string }> = {
        CONFIRMED: { text1: "You're going! 🎉",       text2: "RSVP confirmed successfully" },
        WAITLIST:  { text1: "Added to waitlist ⏳",   text2: "We'll notify you if a spot opens" },
        CANCELLED: { text1: "RSVP cancelled",          text2: "You've been removed from the list" },
      };
      Toast.show({ type: "success", ...messages[nextStatus], visibilityTime: 2500 });
    } catch (err: any) {
      const msg = err?.data?.message ?? "Could not update your RSVP. Please try again.";
      Toast.show({ type: "error", text1: "RSVP failed", text2: msg, visibilityTime: 3000 });
    } finally {
      setLoadingStatus(null);
    }
  }

  // ── RSVP button ─────────────────────────────────────────────────────────────
  function RsvpBtn({
    status,
    label,
    icon,
    color,
  }: {
    status: NonNullable<RsvpStatus>;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    color: string;
  }) {
    const isActive   = localStatus === status;
    const isLoading  = loadingStatus === status;
    const isDisabled = !!loadingStatus || (!isActive && !!localStatus && localStatus !== "CANCELLED");
    return (
      <TouchableOpacity
        style={[
          s.rsvpBtn,
          {
            backgroundColor: isActive ? `${color}18` : neutral[50],
            borderColor: isActive ? color : neutral[200],
            opacity: isDisabled ? 0.4 : 1,
          },
        ]}
        onPress={() => handleRsvp(status)}
        activeOpacity={0.8}
        disabled={isDisabled}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <Ionicons
            name={icon}
            size={22}
            color={isActive ? color : neutral[400]}
          />
        )}
        <Text style={[s.rsvpLabel, { color: isActive ? color : neutral[500] }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={s.wrap}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Status banner ──────────────────────────────────────────────────── */}
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
          {/* Icon circle */}
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
              name={localStatus === "CONFIRMED" ? "ticket-outline" : "time-outline"}
              size={20}
              color="#fff"
            />
          </View>

          {/* Text */}
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
              {localStatus === "CONFIRMED" ? "You're going! 🎉" : "You're on the waitlist ⏳"}
            </Text>
            <Text style={s.bannerSub}>
              {localStatus === "CONFIRMED"
                ? "Your RSVP is confirmed"
                : "We'll notify you if a spot opens"}
            </Text>
          </View>

          {/* Status pill */}
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

      {/* ── Ticket tiers (if paid tickets exist) ───────────────────────────── */}
      {hasPaidTickets && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Choose a Ticket</Text>
          {ticketsLoading ? (
            <ActivityIndicator color={brand.primary} style={{ marginTop: 8 }} />
          ) : (
            tickets.map((ticket) => {
              const selected = selectedTicketId === ticket.id;
              return (
                <TouchableOpacity
                  key={ticket.id}
                  style={[
                    s.ticketRow,
                    selected && {
                      borderColor: brand.primary,
                      backgroundColor: `${brand.primary}08`,
                    },
                  ]}
                  onPress={() =>
                    setSelectedTicketId(selected ? null : ticket.id)
                  }
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.ticketName}>{ticket.name}</Text>
                    {ticket.description ? (
                      <Text style={s.ticketDesc} numberOfLines={1}>
                        {ticket.description}
                      </Text>
                    ) : null}
                    <Text style={s.ticketAvail}>
                      {ticket.available} spots left
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={s.ticketPrice}>
                      {ticket.currency} {ticket.price.toLocaleString()}
                    </Text>
                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={brand.primary}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      {/* ── RSVP buttons ───────────────────────────────────────────────────── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Your RSVP</Text>
        <View style={s.btnRow}>
          <RsvpBtn
            status="CONFIRMED"
            label={localStatus === "CONFIRMED" ? "Going ✓" : "Going"}
            icon="checkmark-circle-outline"
            color={semantic.success}
          />
          <RsvpBtn
            status="WAITLIST"
            label="Waitlist"
            icon="time-outline"
            color={semantic.warning}
          />
          <RsvpBtn
            status="CANCELLED"
            label="Can't Go"
            icon="close-circle-outline"
            color={semantic.error}
          />
        </View>
      </View>

      {/* ── Who's going ─────────────────────────────────────────────────────── */}
      <View style={s.section}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={[s.sectionTitle, { color: neutral[400] }]}>
            Who's Going
          </Text>
          <Text style={[s.sectionTitle, { color: neutral[400] }]}>
            {attendeesRes?.data?.meta?.total} attending
          </Text>
        </View>
        <View style={s.attendeesCard}>
          {attendeesLoading ? (
            <ActivityIndicator
              color={brand.primary}
              style={{ paddingVertical: 20 }}
            />
          ) : attendees.length === 0 ? (
            <View style={s.emptyRow}>
              <Ionicons name="people-outline" size={28} color={neutral[300]} />
              <Text style={s.emptyText}>No attendees yet — be the first!</Text>
            </View>
          ) : (
            attendees.map((a, idx) => {
              const name = a?.user?.displayName ?? a?.user?.username ?? "User";
              const confirmed = a?.status === "CONFIRMED" || a.checkedIn;
              return (
                <View
                  key={a.userId}
                  style={[s.attendeeRow, idx === 0 && { borderTopWidth: 0 }]}
                >
                  <Avatar
                    name={name}
                    avatarUrl={a?.user?.avatarUrl}
                    size={38}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.attendeeName}>{name}</Text>
                    {a.username && (
                      <Text style={s.attendeeHandle}>@{a.username}</Text>
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
                </View>
              );
            })
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 20 },

  // Banner
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
  bannerPillText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },

  // Section
  section: { gap: 10 },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },

  // Ticket
  ticketRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
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
  ticketPrice: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: brand.primary,
  },

  // RSVP buttons
  btnRow: { flexDirection: "row", gap: 10 },
  rsvpBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  rsvpLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
  },

  // Info card
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: neutral[100],
    backgroundColor: neutral[50],
    padding: 14,
    gap: 10,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[700],
    flex: 1,
  },

  // Attendees
  attendeesCard: {
   gap: 10,
    overflow: "hidden",
  },
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
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
  },
});

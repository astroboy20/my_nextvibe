import { brand, neutral, semantic } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import {
    useGetPublishPreviewQuery,
    useUpdateEventStatusMutation,
} from "@/store/api/eventsApi";
import {
    useGetQuoteMutation,
    useInitiatePlanPaymentMutation,
    type PlanQuote,
    type PlanType,
} from "@/store/api/organizerPaymentApi";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// ── Plan labels ───────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<PlanType, string> = {
  VIBETAGS_SINGLE: "VibeTags — Single Phase",
  VIBETAGS_BUNDLE: "VibeTags — Full Bundle",
  GAMIFICATION_SINGLE: "Gamification — Single Phase",
  GAMIFICATION_BUNDLE: "Gamification — Full Bundle",
  MEGA_BUNDLE_SINGLE: "Mega Bundle — Single Phase",
  MEGA_BUNDLE_FULL: "Mega Bundle — Full Event",
};

const PLAN_DESCRIPTIONS: Record<PlanType, string> = {
  VIBETAGS_SINGLE: "VibeTags for one event phase",
  VIBETAGS_BUNDLE: "VibeTags across all phases",
  GAMIFICATION_SINGLE: "Games for one event phase",
  GAMIFICATION_BUNDLE: "Games across all phases",
  MEGA_BUNDLE_SINGLE: "Games + VibeTags for one phase",
  MEGA_BUNDLE_FULL: "Games + VibeTags for the full event",
};

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: PlanQuote;
  selected: boolean;
  onSelect: () => void;
}) {
  const hasDiscount =
    plan.volumeDiscountPercent > 0 || plan.couponDiscountAmount > 0;

  return (
    <TouchableOpacity
      style={[s.planCard, selected && s.planCardSelected]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      <View style={s.planCardInner}>
        <View style={s.planCardLeft}>
          <Text style={s.planName} numberOfLines={1}>
            {PLAN_LABELS[plan.planType]}
          </Text>
          <Text style={s.planDesc}>{PLAN_DESCRIPTIONS[plan.planType]}</Text>
          {plan.gamesIncluded != null && plan.gamesIncluded > 0 && (
            <Text style={s.planDesc}>
              Includes {plan.gamesIncluded} game session
              {plan.gamesIncluded !== 1 ? "s" : ""}
            </Text>
          )}
        </View>
        <View style={s.planCardRight}>
          {hasDiscount && (
            <Text style={s.planOriginalPrice}>
              ₦{plan.baseAmount.toLocaleString()}
            </Text>
          )}
          <Text style={s.planPrice}>₦{plan.finalAmount.toLocaleString()}</Text>
          {plan.volumeDiscountPercent > 0 && (
            <View style={s.discountBadge}>
              <Text style={s.discountBadgeText}>
                {plan.volumeDiscountPercent}% off
              </Text>
            </View>
          )}
        </View>
      </View>
      {selected && (
        <Ionicons
          name="checkmark-circle"
          size={18}
          color={brand.primary}
          style={s.selectedCheck}
        />
      )}
    </TouchableOpacity>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
  eventStatus?: string;
  onPublished?: () => void;
}

export default function PaymentModule({
  eventId,
  eventStatus,
  onPublished,
}: Props) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>();
  const [quotedPlan, setQuotedPlan] = useState<PlanQuote | null>(null);

  const {
    data: previewData,
    isLoading,
    isError,
    refetch,
  } = useGetPublishPreviewQuery(eventId, {
    skip: !eventId || (!!eventStatus && eventStatus !== "DRAFT"),
  });

  const [getQuote, { isLoading: isQuoting }] = useGetQuoteMutation();
  const [initiatePlanPayment, { isLoading: isInitiating }] =
    useInitiatePlanPaymentMutation();
  const [updateEventStatus, { isLoading: isPublishing }] =
    useUpdateEventStatusMutation();

  const preview = previewData?.data;

  // Auto-select the first plan when preview loads
  useEffect(() => {
    if (preview?.availablePlans?.length && !selectedPlan) {
      setSelectedPlan(preview.availablePlans[0].planType);
    }
  }, [preview, selectedPlan]);

  // Don't render for non-DRAFT events
  if (eventStatus && eventStatus !== "DRAFT") return null;

  if (isLoading) {
    return (
      <View style={s.loadingBox}>
        <ActivityIndicator color={brand.primary} />
        <Text style={s.loadingText}>Loading publish options…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={s.errorBox}>
        <Ionicons
          name="alert-circle-outline"
          size={24}
          color={semantic.error}
        />
        <Text style={s.errorText}>Could not load publish options.</Text>
        <View style={s.errorActions}>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => refetch()}
            activeOpacity={0.8}
          >
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.retryBtn, { borderColor: brand.primary }]}
            onPress={async () => {
              try {
                await updateEventStatus({
                  eventId,
                  status: "PUBLISHED",
                }).unwrap();
                Alert.alert("Published!", "Your event is now live.");
                onPublished?.();
              } catch (err: any) {
                Alert.alert(
                  "Error",
                  err?.data?.message ?? "Failed to publish event."
                );
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={[s.retryBtnText, { color: brand.primary }]}>
              Publish for Free
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!preview) return null;

  // ── Free publish path ──────────────────────────────────────────────────────
  if (preview.isFreePublish) {
    return (
      <View style={s.freeBox}>
        <View style={s.freeTopRow}>
          <Ionicons name="checkmark-circle" size={28} color={semantic.success} />
          <View style={s.freeTextWrap}>
            <Text style={s.freeTitle}>Free Publish Available</Text>
            <Text style={s.freeDesc}>
              No games or VibeTags — your event publishes for free.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[s.ctaBtn, isPublishing && s.ctaBtnDisabled]}
          disabled={isPublishing}
          onPress={async () => {
            try {
              await updateEventStatus({
                eventId,
                status: "PUBLISHED",
              }).unwrap();
              Alert.alert("Published!", "Your event is now live.");
              onPublished?.();
            } catch (err: any) {
              Alert.alert(
                "Error",
                err?.data?.message ?? "Failed to publish event."
              );
            }
          }}
          activeOpacity={0.8}
        >
          {isPublishing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="sparkles" size={16} color="#fff" />
              <Text style={s.ctaBtnText}>Publish for Free</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // ── Paid publish path ──────────────────────────────────────────────────────
  const plans = preview.availablePlans;
  const activePlan =
    quotedPlan ??
    plans.find((p) => p.planType === selectedPlan) ??
    plans[0] ??
    null;

  const handleApplyCoupon = async () => {
    if (!selectedPlan || !couponInput.trim()) return;
    try {
      const res = await getQuote({
        eventId,
        planType: selectedPlan,
        couponCode: couponInput.trim(),
      }).unwrap();
      setQuotedPlan(res.data);
      setAppliedCoupon(couponInput.trim());
    } catch (err: any) {
      Alert.alert(
        "Invalid Coupon",
        err?.data?.message ?? "Invalid or expired coupon."
      );
    }
  };

  const handlePlanSelect = (planType: PlanType) => {
    setSelectedPlan(planType);
    setQuotedPlan(null);
    if (appliedCoupon) {
      getQuote({ eventId, planType, couponCode: appliedCoupon })
        .unwrap()
        .then((res) => setQuotedPlan(res.data))
        .catch(() => {
          setAppliedCoupon(undefined);
          setCouponInput("");
        });
    }
  };

  const handleActivate = async () => {
    if (!selectedPlan) return;
    try {
      const res = await initiatePlanPayment({
        eventId,
        planType: selectedPlan,
        ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
      }).unwrap();

      const { status, checkoutUrl } = res.data;

      if (status === "COMPLETED" || !checkoutUrl) {
        Alert.alert("Published!", "Your event is now live.");
        refetch();
        onPublished?.();
        return;
      }

      // Open checkout in browser
      await Linking.openURL(checkoutUrl);
    } catch (err: any) {
      Alert.alert("Error", err?.data?.message ?? "Failed to initiate payment.");
    }
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Ionicons name="card-outline" size={18} color={brand.primary} />
        <Text style={s.headerTitle}>Publish Your Event</Text>
        <View style={s.paymentBadge}>
          <Ionicons name="lock-closed-outline" size={11} color="#b45309" />
          <Text style={s.paymentBadgeText}>Payment Required</Text>
        </View>
      </View>

      {/* Event summary */}
      <View style={s.summaryBox}>
        <View style={s.summaryRow}>
          <Text style={s.summaryLabel}>Tier</Text>
          <Text style={s.summaryValue}>{preview.tier}</Text>
        </View>
        {preview.gameSessionCount > 0 && (
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Game sessions</Text>
            <Text style={s.summaryValue}>{preview.gameSessionCount}</Text>
          </View>
        )}
        {preview.vibetagCount > 0 && (
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>VibeTags</Text>
            <Text style={s.summaryValue}>{preview.vibetagCount}</Text>
          </View>
        )}
      </View>

      {/* Plan selector */}
      <Text style={s.sectionLabel}>Choose a Plan</Text>
      <View style={s.planList}>
        {plans.map((plan) => (
          <PlanCard
            key={plan.planType}
            plan={plan}
            selected={selectedPlan === plan.planType}
            onSelect={() => handlePlanSelect(plan.planType)}
          />
        ))}
      </View>

      {/* Coupon */}
      <View style={s.couponRow}>
        <TextInput
          style={s.couponInput}
          placeholder="Coupon code (optional)"
          placeholderTextColor={neutral[400]}
          value={couponInput}
          onChangeText={setCouponInput}
          autoCapitalize="characters"
          returnKeyType="done"
          onSubmitEditing={handleApplyCoupon}
        />
        <TouchableOpacity
          style={[
            s.couponBtn,
            (!couponInput.trim() || isQuoting) && s.couponBtnDisabled,
          ]}
          onPress={handleApplyCoupon}
          disabled={!couponInput.trim() || isQuoting}
          activeOpacity={0.8}
        >
          {isQuoting ? (
            <ActivityIndicator color={brand.primary} size="small" />
          ) : (
            <Text style={s.couponBtnText}>Apply</Text>
          )}
        </TouchableOpacity>
      </View>

      {appliedCoupon && quotedPlan && (
        <View style={s.couponAppliedRow}>
          <Text style={s.couponAppliedText}>
            Coupon "{appliedCoupon}" applied
          </Text>
          <Text style={s.couponAppliedSaving}>
            −₦{quotedPlan.couponDiscountAmount.toLocaleString()}
          </Text>
        </View>
      )}

      {/* Total */}
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>Total</Text>
        <Text style={s.totalAmount}>
          ₦{(activePlan?.finalAmount ?? 0).toLocaleString()}
        </Text>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[
          s.ctaBtn,
          (!selectedPlan || isInitiating || isPublishing) && s.ctaBtnDisabled,
        ]}
        disabled={!selectedPlan || isInitiating || isPublishing}
        onPress={handleActivate}
        activeOpacity={0.8}
      >
        {isInitiating || isPublishing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="sparkles" size={16} color="#fff" />
            <Text style={s.ctaBtnText}>
              {activePlan?.finalAmount === 0
                ? "Publish Event (Free)"
                : "Pay & Publish Event"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={s.ctaHint}>
        {activePlan?.finalAmount === 0
          ? "Your coupon covers the full cost. Tap to publish immediately."
          : "You'll be redirected to a secure payment page."}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    gap: 12,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
  },
  loadingText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[500],
  },
  errorBox: {
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${semantic.error}30`,
    backgroundColor: `${semantic.error}06`,
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[500],
    textAlign: "center",
  },
  errorActions: {
    flexDirection: "row",
    gap: 10,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[300],
  },
  retryBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[600],
  },
  freeBox: {
    gap: 10,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${semantic.success}30`,
    backgroundColor: `${semantic.success}06`,
  },
  freeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  freeTextWrap: { flex: 1, gap: 3 },
  freeTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: neutral[800],
  },
  freeDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: neutral[800],
  },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: "#fef3c7",
  },
  paymentBadgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: "#b45309",
  },
  summaryBox: {
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[50],
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
  },
  summaryValue: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: neutral[700],
    textTransform: "capitalize",
  },
  sectionLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: neutral[500],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  planList: { gap: 8 },
  planCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    padding: 12,
    backgroundColor: "#fff",
  },
  planCardSelected: {
    borderColor: brand.primary,
    backgroundColor: `${brand.primary}08`,
  },
  planCardInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  planCardLeft: { flex: 1, gap: 2 },
  planCardRight: { alignItems: "flex-end", gap: 2 },
  planName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  planDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[500],
  },
  planOriginalPrice: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    textDecorationLine: "line-through",
  },
  planPrice: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: brand.primary,
  },
  discountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: `${semantic.success}15`,
  },
  discountBadgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: semantic.success,
  },
  selectedCheck: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  couponRow: {
    flexDirection: "row",
    gap: 8,
  },
  couponInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: neutral[200],
    paddingHorizontal: 12,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
    backgroundColor: "#fff",
  },
  couponBtn: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
  },
  couponBtnDisabled: { borderColor: neutral[300] },
  couponBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: brand.primary,
  },
  couponAppliedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: `${semantic.success}12`,
  },
  couponAppliedText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: semantic.success,
  },
  couponAppliedSaving: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: semantic.success,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: neutral[200],
  },
  totalLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[700],
  },
  totalAmount: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    color: brand.primary,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: brand.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  ctaBtnDisabled: { opacity: 0.45 },
  ctaBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: "#fff",
  },
  ctaHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: neutral[400],
    textAlign: "center",
    lineHeight: 16,
  },
});

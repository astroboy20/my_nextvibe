import AuthModal from '@/components/auth/AuthModal';
import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/hooks/useAuthModal';
import {
    useGetEventPostcardsQuery,
} from '@/store/api/eventsApi';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { PostcardCreator } from './PostcardCreator';
import { PostcardLeaderboard } from './PostcardLeaderboard';
import { PostcardViewer } from './PostcardViewer';
import type {
    ActivityTiming,
    PostcardData,
    PostcardPhase,
    VibeTag,
} from './types';
import { TIMING_META, TIMING_PILL } from './types';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 14;
// No gap between tiles — flush grid, taller tiles to show more content
const TILE_W = SCREEN_W / 2;
const TILE_H = TILE_W * (5 / 4);  // taller: was 4/3, now shows more

const TIMING_TABS: ActivityTiming[] = ['PRE_EVENT', 'DURING_EVENT', 'POST_EVENT'];

// ─── PostcardTile ─────────────────────────────────────────────────────────────

function PostcardTile({
    postcard,
    vibeTagMap,
    onPress,
    index,
}: {
    postcard: any;
    vibeTagMap: Record<string, VibeTag>;
    onPress: () => void;
    index: number;
}) {
    const tag = vibeTagMap[postcard?.vibeTagId];
    const timing: string = tag?.activityTiming ?? '';
    const pill = TIMING_PILL[timing];
    const authorName =
        postcard?.author?.displayName?.trim() ||
        postcard?.author?.username?.trim() ||
        '';

    const mediaItems: any[] = postcard?.media ?? [];
    const firstMedia = mediaItems[0];
    const src = firstMedia?.mediaUrl ?? '';
    const isVideo = firstMedia?.mediaType === 'VIDEO';
    const hasMultiple = mediaItems.filter((m: any) => !!m.mediaUrl).length > 1;

    if (!src) return null;

    return (
        <TouchableOpacity
            style={tile.wrap}
            onPress={onPress}
            activeOpacity={0.9}
        >
            {/* Always use Image for thumbnail — avoids Video autoplay in grid */}
            <Image
                source={{ uri: src }}
                style={tile.img}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
                priority={index < 6 ? 'high' : 'normal'}
                recyclingKey={src}
            />

            {/* Video play badge */}
            {isVideo && (
                <View style={tile.videoBadge} pointerEvents="none">
                    <Ionicons name="play" size={13} color="#fff" />
                </View>
            )}

            {/* Multiple media indicator — top right */}
            {hasMultiple && (
                <View style={tile.multiBadge} pointerEvents="none">
                    <Ionicons name="layers" size={12} color="#fff" />
                </View>
            )}

            {/* Timing pill — top left */}
            {pill && (
                <View style={[tile.pill, { backgroundColor: pill.color }]} pointerEvents="none">
                    <Text style={tile.pillText}>{pill.label}</Text>
                </View>
            )}

            {/* Bottom overlay */}
            <View style={tile.bottom} pointerEvents="none">
                {authorName ? (
                    <Text style={tile.author} numberOfLines={1}>@{authorName}</Text>
                ) : null}
                <View style={tile.stats}>
                    <View style={tile.statItem}>
                        <Ionicons name="heart" size={11} color="#fff" />
                        <Text style={tile.statText}>{postcard?.likeCount ?? 0}</Text>
                    </View>
                    <View style={tile.statItem}>
                        <Ionicons name="chatbubble" size={10} color="#fff" />
                        <Text style={tile.statText}>{postcard?.commentCount ?? 0}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ─── PhaseGrid ────────────────────────────────────────────────────────────────

function PhaseGrid({
    eventId,
    phase,
    vibeTagMap,
    onSelect,
}: {
    eventId: string;
    phase: PostcardPhase;
    vibeTagMap: Record<string, VibeTag>;
    onSelect: (postcards: PostcardData[], index: number) => void;
}) {
    const { data, isLoading } = useGetEventPostcardsQuery(
        { eventId, phase: phase === 'all' ? undefined : phase },
        { skip: !eventId },
    );

    const rawList: any[] =
        (data as any)?.data?.data ?? (data as any)?.data ?? [];
    const postcards: PostcardData[] = rawList.filter((p: any) =>
        (p?.media ?? []).some((m: any) => !!m.mediaUrl),
    ).map((p: any) => ({
        ...p,
        vibeTagId: p.vibeTagId ?? p.vibeTag?.id ?? null,
    }));

    if (isLoading) {
        return (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator color={brand.primary} />
            </View>
        );
    }

    if (postcards.length === 0) {
        return (
            <View style={grid.empty}>
                <Ionicons name="images-outline" size={36} color={neutral[300]} />
                <Text style={grid.emptyTitle}>No postcards yet</Text>
                <Text style={grid.emptySub}>Be the first to share a memory!</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={postcards}
            keyExtractor={(item, i) => (item as any)?.id ?? String(i)}
            numColumns={2}
            scrollEnabled={false}
            // No gap — flush grid
            columnWrapperStyle={{ gap: 0 }}
            ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
            renderItem={({ item, index }) => (
                <PostcardTile
                    postcard={item}
                    vibeTagMap={vibeTagMap}
                    onPress={() => onSelect(postcards, index)}
                    index={index}
                />
            )}
        />
    );
}

const grid = StyleSheet.create({
    empty: { alignItems: 'center', paddingVertical: 40, gap: 6 },
    emptyTitle: {
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.sm,
        color: neutral[600],
    },
    emptySub: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.sm,
        color: neutral[400],
        textAlign: 'center',
    },
});

// ─── Main PostcardsTab ────────────────────────────────────────────────────────

interface Props {
    eventId: string;
    vibeTag?: VibeTag[] | null;
    eventName?: string;
    eventStartsAt?: string | null;
}

export default function PostcardsTab({
    eventId,
    vibeTag,
    eventName = 'Event',
    eventStartsAt,
}: Props) {
    const { user, isAuthenticated } = useAuth();
    const { visible: authModalVisible, showAuthModal, hideAuthModal } = useAuthModal();

    const [activeTiming, setActiveTiming] = useState<ActivityTiming>('PRE_EVENT');
    const [postcardPhase, setPostcardPhase] = useState<PostcardPhase>('all');
    const [showCreator, setShowCreator] = useState(false);

    // Pending action to retry after auth
    const [pendingCreate, setPendingCreate] = useState(false);

    // Viewer state: list + starting index
    const [viewerPostcards, setViewerPostcards] = useState<PostcardData[]>([]);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [showViewer, setShowViewer] = useState(false);

    // Fetch THIS user's postcards to check the per-user 20-cap
    const { data: myPostcardsData } = useGetEventPostcardsQuery(
        { eventId, limit: 50 },
        { skip: !eventId },
    );
    // Filter to only this user's own postcards for the cap check
    const myPostcards: any[] = (
        (myPostcardsData as any)?.data?.data ??
        (myPostcardsData as any)?.data ?? []
    ).filter(
        (p: any) =>
            user?.id
                ? p?.author?.id === user.id || p?.authorId === user.id
                : false,
    );
    const userPostcardCount = myPostcards.length;

    const allTags: VibeTag[] = Array.isArray(vibeTag) ? vibeTag : [];
    const vibeTagMap: Record<string, VibeTag> = Object.fromEntries(
        allTags.map((t) => [t.id, t]),
    );

    const activeTag: VibeTag | null =
        allTags.find((t) => t.activityTiming === activeTiming) ??
        allTags[0] ??
        null;

    const vibeTagOverlay = activeTag?.imageUrl
        ? { imageUrl: activeTag.imageUrl, name: activeTag.name }
        : null;

    const eventHasStarted = eventStartsAt
        ? new Date() >= new Date(eventStartsAt)
        : true;

    const openViewer = (postcards: PostcardData[], index: number) => {
        // Resolve vibeTagOverlayUrl for each postcard's media items
        // The backend stores vibeTagId on the postcard but doesn't always
        // inline the overlay URL into each media item — resolve it here
        const enriched = postcards.map((p) => {
            const tag = p.vibeTagId ? vibeTagMap[p.vibeTagId] : null;
            const overlayUrl = tag?.imageUrl ?? null;
            return {
                ...p,
                media: (p.media ?? []).map((m) => ({
                    ...m,
                    vibeTagOverlayUrl: m.vibeTagOverlayUrl ?? overlayUrl,
                })),
            };
        });
        setViewerPostcards(enriched);
        setViewerIndex(index);
        setShowViewer(true);
    };

    const openCreator = () => {
        if (!isAuthenticated) {
            setPendingCreate(true);
            showAuthModal();
            return;
        }
        setShowCreator(true);
    };

    const handleAuthSuccess = () => {
        hideAuthModal();
        if (pendingCreate) {
            setPendingCreate(false);
            setShowCreator(true);
        }
    };

    const POSTCARD_PHASE_TABS: { value: PostcardPhase; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'pre-event', label: 'Pre' },
        { value: 'main-event', label: 'Main' },
        { value: 'post-event', label: 'Post' },
    ];

    return (
        <View style={s.wrap}>
            {/* PostcardsTab now renders inside a flex:1 View (not inside an outer ScrollView)
                so its internal ScrollView + FlatList are safe */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.content}
                nestedScrollEnabled={false}
            >
                {/* ── Timing tabs ──────────────────────────────────────────────── */}
                <View style={s.timingRow}>
                    {TIMING_TABS.map((timing) => {
                        const active = activeTiming === timing;
                        return (
                            <TouchableOpacity
                                key={timing}
                                style={[s.timingBtn, active && s.timingBtnActive]}
                                onPress={() => setActiveTiming(timing)}
                                activeOpacity={0.8}
                            >
                                <Text style={[s.timingLabel, active && s.timingLabelActive]}>
                                    {TIMING_META[timing].label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ── VibeTag card ─────────────────────────────────────────────── */}
                <View style={s.vibeCard}>
                    <View style={s.vibeCardHeader}>
                        <View style={s.vibeCardIcon}>
                            <Ionicons name="pricetag" size={22} color="#fff" />
                        </View>
                        <View style={s.vibeCardMeta}>
                            <Text style={s.vibeCardTitle}>
                                {TIMING_META[activeTiming].label} VibeTag
                            </Text>
                            <Text style={s.vibeCardSub} numberOfLines={1}>
                                {activeTag?.name ?? 'No VibeTag set for this event'}
                            </Text>
                        </View>
                        <View style={s.vibeBadge}>
                            <Text style={s.vibeBadgeText}>
                                {TIMING_META[activeTiming].label}
                            </Text>
                        </View>
                    </View>

                    {/* VibeTag preview */}
                    <View style={s.vibePreviewWrap}>
                        <View style={s.vibePreviewBorder}>
                            <View style={s.vibePreviewInner}>
                                {activeTag?.imageUrl ? (
                                    <Image
                                        source={{ uri: activeTag.imageUrl }}
                                        style={StyleSheet.absoluteFillObject}
                                        contentFit="cover"
                                    />
                                ) : (
                                    <View style={s.vibePreviewEmpty}>
                                        <Ionicons name="sparkles" size={28} color={brand.primary} />
                                        <Text style={s.vibePreviewEmptyText}>VibeTag</Text>
                                        <Text style={s.vibePreviewEmptySubText}>Not set</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {activeTag && (
                        <View style={s.vibeAppliedBadge}>
                            <Ionicons name="sparkles" size={12} color={brand.primary} />
                            <Text style={s.vibeAppliedText}>
                                This VibeTag will be applied to your postcards
                            </Text>
                        </View>
                    )}

                    {activeTiming === 'DURING_EVENT' && !eventHasStarted && (
                        <View style={s.warningBox}>
                            <Text style={s.warningTitle}>Event hasn't started yet</Text>
                            <Text style={s.warningSub}>
                                This VibeTag unlocks once the main event begins.
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[
                            s.createBtn,
                            (!activeTag ||
                                (activeTiming === 'DURING_EVENT' && !eventHasStarted)) &&
                            s.createBtnDisabled,
                        ]}
                        onPress={openCreator}
                        disabled={
                            !activeTag ||
                            (activeTiming === 'DURING_EVENT' && !eventHasStarted)
                        }
                        activeOpacity={0.85}
                    >
                        <Ionicons name="camera" size={18} color="#fff" />
                        <Text style={s.createBtnText}>Create Your Postcard</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Postcards section ─────────────────────────────────────────── */}
                <View style={s.sectionHeader}>
                    <Text style={s.sectionTitle}>Event Postcards</Text>
                </View>

                {/* <View style={s.phaseRow}>
                    {POSTCARD_PHASE_TABS.map((tab) => {
                        const active = postcardPhase === tab.value;
                        return (
                            <TouchableOpacity
                                key={tab.value}
                                style={[s.phaseBtn, active && s.phaseBtnActive]}
                                onPress={() => setPostcardPhase(tab.value)}
                                activeOpacity={0.8}
                            >
                                <Text style={[s.phaseLabel, active && s.phaseLabelActive]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View> */}

                {/* Grid — no horizontal padding so tiles touch screen edges */}
                {eventId && (
                    <View style={s.gridWrap}>
                        <PhaseGrid
                            eventId={eventId}
                            phase={postcardPhase}
                            vibeTagMap={vibeTagMap}
                            onSelect={openViewer}
                        />
                    </View>
                )}

                <PostcardLeaderboard eventId={eventId} />
            </ScrollView>

            {/* Creator */}
            {showCreator && activeTag && (
                <PostcardCreator
                    vibeTagName={activeTag.name}
                    vibeTagOverlay={vibeTagOverlay}
                    vibeTagId={activeTag.id}
                    eventName={eventName}
                    eventId={eventId}
                    userPostcardCount={userPostcardCount}
                    onClose={() => setShowCreator(false)}
                    onSubmit={() => {
                        Toast.show({
                            type: 'success',
                            text1: 'Memory added to the event gallery!',
                        });
                        setShowCreator(false);
                    }}
                />
            )}

            {/* Full-screen vertical viewer */}
            {showViewer && viewerPostcards.length > 0 && (
                <PostcardViewer
                    postcards={viewerPostcards}
                    initialIndex={viewerIndex}
                    eventId={eventId}
                    onClose={() => setShowViewer(false)}
                />
            )}

            {/* Auth modal — shown when session expired or user is not logged in */}
            <AuthModal
                visible={authModalVisible}
                onDismiss={() => { hideAuthModal(); setPendingCreate(false); }}
                onSuccess={handleAuthSuccess}
                message="Sign in to create a postcard for this event"
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    wrap: { flex: 1 },
    content: { paddingTop: 14, paddingBottom: 40 },

    timingRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 14,
        paddingHorizontal: H_PAD,
    },
    timingBtn: {
        flex: 1,
        paddingVertical: 9,
        borderRadius: 20,
        backgroundColor: neutral[100],
        alignItems: 'center',
    },
    timingBtnActive: { backgroundColor: brand.primary },
    timingLabel: { fontFamily: fontFamily.semibold, fontSize: 12, color: neutral[500] },
    timingLabelActive: { color: '#fff' },

    vibeCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: `${brand.primary}20`,
        backgroundColor: `${brand.primary}06`,
        padding: 14,
        marginBottom: 20,
        gap: 12,
        marginHorizontal: H_PAD,
    },
    vibeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    vibeCardIcon: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: brand.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    vibeCardMeta: { flex: 1, minWidth: 0 },
    vibeCardTitle: {
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.sm,
        color: neutral[800],
    },
    vibeCardSub: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.xs,
        color: neutral[500],
    },
    vibeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: `${brand.primary}40`,
        backgroundColor: '#fff',
    },
    vibeBadgeText: { fontFamily: fontFamily.semibold, fontSize: 10, color: brand.primary },

    vibePreviewWrap: { alignItems: 'center' },
    vibePreviewBorder: {
        width: 130,
        aspectRatio: 3 / 4,
        borderRadius: 16,
        padding: 3,
        backgroundColor: brand.primary,
    },
    vibePreviewInner: {
        flex: 1,
        borderRadius: 13,
        overflow: 'hidden',
        backgroundColor: neutral[100],
    },
    vibePreviewEmpty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    vibePreviewEmptyText: {
        fontFamily: fontFamily.semibold,
        fontSize: 12,
        color: neutral[700],
    },
    vibePreviewEmptySubText: {
        fontFamily: fontFamily.regular,
        fontSize: 11,
        color: neutral[400],
    },

    vibeAppliedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: `${brand.primary}30`,
        backgroundColor: '#fff',
    },
    vibeAppliedText: {
        fontFamily: fontFamily.regular,
        fontSize: 11,
        color: neutral[600],
    },

    warningBox: {
        borderRadius: 12,
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FDE68A',
        padding: 10,
        alignItems: 'center',
        gap: 2,
    },
    warningTitle: { fontFamily: fontFamily.semibold, fontSize: 12, color: '#92400E' },
    warningSub: {
        fontFamily: fontFamily.regular,
        fontSize: 11,
        color: '#92400E',
        textAlign: 'center',
    },

    createBtn: {
        height: 48,
        borderRadius: 14,
        backgroundColor: brand.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    createBtnDisabled: { opacity: 0.45 },
    createBtnText: {
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.sm,
        color: '#fff',
    },

    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingHorizontal: H_PAD,
    },
    sectionTitle: {
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.base,
        color: neutral[800],
    },

    phaseRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 12,
        paddingHorizontal: H_PAD,
    },
    phaseBtn: {
        flex: 1,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: neutral[100],
        alignItems: 'center',
    },
    phaseBtnActive: { backgroundColor: brand.primaryDark },
    phaseLabel: { fontFamily: fontFamily.semibold, fontSize: 11, color: neutral[500] },
    phaseLabelActive: { color: '#fff' },

    // Grid touches screen edges — no horizontal padding
    gridWrap: { marginBottom: 16 },
});

// ─── Tile styles ──────────────────────────────────────────────────────────────

const tile = StyleSheet.create({
    wrap: {
        width: TILE_W,
        height: TILE_H,
        overflow: 'hidden',
        // No borderRadius, no margin — flush grid
    },
    img: {
        ...StyleSheet.absoluteFillObject,
    },
    // Video play badge — bottom left
    videoBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Multi-media indicator — top right
    multiBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Timing pill — top left
    pill: {
        position: 'absolute',
        top: 8,
        left: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 20,
    },
    pillText: { fontFamily: fontFamily.bold, fontSize: 9, color: '#fff' },
    // Bottom overlay
    bottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 8,
        paddingBottom: 7,
        paddingTop: 20,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    author: {
        fontFamily: fontFamily.semibold,
        fontSize: 10,
        color: '#fff',
        marginBottom: 3,
    },
    stats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    statText: {
        fontFamily: fontFamily.semibold,
        fontSize: 10,
        color: 'rgba(255,255,255,0.9)',
    },
});

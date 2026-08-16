/**
 * EventPostcards — React Native
 *
 * Full-screen screen showing all postcards for an event in a 3-column
 * masonry-style grid (Pinterest/Instagram Explore style).
 * Tap any tile to open the full-screen PostcardViewer.
 */
import { PostcardViewer } from '@/components/event/PostcardsTab/PostcardViewer';
import type { PostcardData } from '@/components/event/PostcardsTab/types';
import { brand, neutral } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { useGetEventByIdQuery, useGetEventPostcardsQuery } from '@/store/api/eventsApi';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');
// 3-column grid, 1px gaps between tiles
const NUM_COLS = 3;
const TILE_W = (W - (NUM_COLS - 1)) / NUM_COLS;

type Phase = 'all' | 'pre-event' | 'main-event' | 'post-event';
const PHASES: { value: Phase; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pre-event', label: 'Pre' },
    { value: 'main-event', label: 'Main' },
    { value: 'post-event', label: 'Post' },
];

// ─── Tile ─────────────────────────────────────────────────────────────────────

function Tile({
    postcard,
    index,
    onPress,
}: {
    postcard: PostcardData;
    index: number;
    onPress: () => void;
}) {
    const media = (postcard.media ?? []).filter((m) => !!m.mediaUrl);
    const first = media[0];
    if (!first?.mediaUrl) return null;

    const isVideo = first.mediaType === 'VIDEO';
    const hasMultiple = media.length > 1;

    // Vary tile heights for visual interest (3-column masonry feel)
    const heights = [TILE_W * 1.4, TILE_W * 1.1, TILE_W * 1.6, TILE_W * 1.25, TILE_W * 1.0, TILE_W * 1.5];
    const h = heights[index % heights.length];

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={{ width: TILE_W }}>
            <View style={[t.tile, { height: h }]}>
                <Image
                    source={{ uri: first.mediaUrl }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    priority={index < 9 ? 'high' : 'normal'}
                    recyclingKey={first.mediaUrl}
                    transition={100}
                />
                {isVideo && (
                    <View style={t.videoBadge} pointerEvents="none">
                        <Ionicons name="play" size={11} color="#fff" />
                    </View>
                )}
                {hasMultiple && (
                    <View style={t.layersBadge} pointerEvents="none">
                        <Ionicons name="layers" size={11} color="#fff" />
                    </View>
                )}
                {/* Bottom scrim */}
                <View style={t.scrim} pointerEvents="none">
                    <View style={t.scrimStats}>
                        <Ionicons name="heart" size={9} color="#fff" />
                        <Text style={t.scrimText}>{postcard.likeCount ?? 0}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const t = StyleSheet.create({
    tile: { overflow: 'hidden', backgroundColor: neutral[100] },
    videoBadge: {
        position: 'absolute', top: 4, left: 4,
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center', justifyContent: 'center',
    },
    layersBadge: {
        position: 'absolute', top: 4, right: 4,
        width: 20, height: 20, borderRadius: 5,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center', justifyContent: 'center',
    },
    scrim: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 5, paddingVertical: 4,
        backgroundColor: 'rgba(0,0,0,0.28)',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    },
    scrimStats: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    scrimText: { fontFamily: fontFamily.bold, fontSize: 9, color: '#fff' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EventPostcards() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [phase, setPhase] = useState<Phase>('all');
    const [page, setPage] = useState(1);
    const [viewerPostcards, setViewerPostcards] = useState<PostcardData[]>([]);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [showViewer, setShowViewer] = useState(false);

    const { data: eventData } = useGetEventByIdQuery(id ?? '', { skip: !id });
    const eventName = eventData?.data?.name ?? 'Event';

    const { data, isLoading, isFetching } = useGetEventPostcardsQuery(
        {
            eventId: id ?? '',
            page,
            limit: 30,
            ...(phase !== 'all' ? { phase } : {}),
        },
        { skip: !id },
    );

    const rawList: any[] = (data as any)?.data?.data ?? (data as any)?.data ?? [];
    const postcards: PostcardData[] = rawList.filter((p: any) =>
        (p?.media ?? []).some((m: any) => !!m.mediaUrl),
    );
    const hasNext = (data as any)?.data?.meta?.hasNext ?? false;

    const openViewer = (index: number) => {
        setViewerPostcards(postcards);
        setViewerIndex(index);
        setShowViewer(true);
    };

    const renderItem = ({ item, index }: { item: PostcardData; index: number }) => (
        <Tile
            postcard={item}
            index={index}
            onPress={() => openViewer(index)}
        />
    );

    return (
        <SafeAreaView style={s.root} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={22} color={neutral[800]} />
                </TouchableOpacity>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.headerTitle}>Postcards</Text>
                    <Text style={s.headerSub} numberOfLines={1}>{eventName}</Text>
                </View>
            </View>

            {/* Phase filter */}
            <View style={s.phaseRow}>
                {PHASES.map((p) => {
                    const active = phase === p.value;
                    return (
                        <TouchableOpacity
                            key={p.value}
                            style={[s.phaseBtn, active && s.phaseBtnActive]}
                            onPress={() => { setPhase(p.value); setPage(1); }}
                            activeOpacity={0.8}
                        >
                            <Text style={[s.phaseLabel, active && s.phaseLabelActive]}>
                                {p.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Grid */}
            {isLoading && postcards.length === 0 ? (
                <View style={s.center}>
                    <ActivityIndicator color={brand.primary} size="large" />
                </View>
            ) : postcards.length === 0 ? (
                <View style={s.center}>
                    <Ionicons name="images-outline" size={44} color={neutral[200]} />
                    <Text style={s.emptyTitle}>No postcards yet</Text>
                    <Text style={s.emptySub}>
                        {phase !== 'all' ? `No postcards for ${phase}` : 'Be the first to share a memory!'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={postcards}
                    keyExtractor={(item, i) => (item as any)?.id ?? String(i)}
                    numColumns={NUM_COLS}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    // 1px gap between all tiles
                    columnWrapperStyle={{ gap: 1 }}
                    ItemSeparatorComponent={() => <View style={{ height: 1 }} />}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    onEndReached={() => {
                        if (hasNext && !isFetching) setPage((p) => p + 1);
                    }}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={
                        isFetching && page > 1 ? (
                            <View style={s.footerLoader}>
                                <ActivityIndicator size="small" color={brand.primary} />
                            </View>
                        ) : null
                    }
                />
            )}

            {/* Viewer */}
            {showViewer && viewerPostcards.length > 0 && (
                <PostcardViewer
                    postcards={viewerPostcards}
                    initialIndex={viewerIndex}
                    eventId={id ?? ''}
                    onClose={() => setShowViewer(false)}
                />
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: neutral[200],
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: neutral[800] },
    headerSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: neutral[400], marginTop: 1 },
    phaseRow: {
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: neutral[100],
    },
    phaseBtn: {
        flex: 1, paddingVertical: 6, borderRadius: 20,
        backgroundColor: neutral[100], alignItems: 'center',
    },
    phaseBtnActive: { backgroundColor: brand.primary },
    phaseLabel: { fontFamily: fontFamily.semibold, fontSize: 11, color: neutral[500] },
    phaseLabelActive: { color: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 60 },
    emptyTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: neutral[600] },
    emptySub: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: neutral[400], textAlign: 'center', paddingHorizontal: 32 },
    footerLoader: { paddingVertical: 20, alignItems: 'center' },
});

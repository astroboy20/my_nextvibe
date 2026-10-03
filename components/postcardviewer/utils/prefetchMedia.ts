import { Image } from "expo-image";
import type { PostcardData } from "../types";
import { warmVideoCache } from "./videoCache";

/**
 * Warms the image cache (and, for the very next card, the video cache) for
 * postcards just outside the current viewport so a swipe lands on media
 * that's already decoded/on-disk instead of starting a fresh fetch.
 */
export async function prefetchAdjacentMedia(
    postcards: PostcardData[],
    activeIndex: number,
    isConnected: boolean,
    isWifi: boolean
) {
    if (!isConnected) return;

    // Look further ahead on Wi-Fi; stay conservative on cellular data
    const lookahead = isWifi ? 2 : 1;
    const indices = [activeIndex - 1, activeIndex + 1];
    for (let i = 2; i <= lookahead; i++) indices.push(activeIndex + i);

    for (const idx of indices) {
        const pc = postcards[idx];
        if (!pc) continue;
        for (const m of pc.media ?? []) {
            const previewUrl = m.mediaType === "VIDEO" ? m.thumbnailUrl : m.mediaUrl;
            if (previewUrl) {
                Image.prefetch(previewUrl, "memory-disk").catch(() => { });
            }
            // Only warm the full video file for the very next card — bandwidth-conscious
            if (m.mediaType === "VIDEO" && m.mediaUrl && idx === activeIndex + 1) {
                warmVideoCache(m.mediaUrl).catch(() => { });
            }
        }
    }
}
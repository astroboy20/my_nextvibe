// expo-file-system v19 (SDK 54+) replaced the old functional API
// (cacheDirectory / getInfoAsync / makeDirectoryAsync / downloadAsync) with a
// new class-based one. The old API still works, just moved to /legacy.
import * as FileSystem from "expo-file-system/legacy";

/**
 * Mirrors played videos into a local cache directory in the background so a
 * revisit (scrolling back to a card) plays instantly from disk instead of
 * re-streaming. Every function here fails silently — streaming from the
 * remote URL always remains the fallback.
 */

const VIDEO_CACHE_DIR = `${FileSystem.cacheDirectory}postcard-videos/`;

function simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = (hash << 5) - hash + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

function videoCacheFilename(uri: string) {
    return `${VIDEO_CACHE_DIR}${simpleHash(uri)}.mp4`;
}

async function ensureVideoCacheDir() {
    const dirInfo = await FileSystem.getInfoAsync(VIDEO_CACHE_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(VIDEO_CACHE_DIR, {
            intermediates: true,
        });
    }
}

/** Returns the local file path if this video is already cached, else null. */
export async function getCachedVideoUri(
    remoteUri: string
): Promise<string | null> {
    try {
        await ensureVideoCacheDir();
        const localPath = videoCacheFilename(remoteUri);
        const info = await FileSystem.getInfoAsync(localPath);
        return info.exists ? localPath : null;
    } catch {
        return null;
    }
}

/** Downloads the video into the cache dir if it isn't there already. */
export async function warmVideoCache(remoteUri: string) {
    try {
        await ensureVideoCacheDir();
        const localPath = videoCacheFilename(remoteUri);
        const info = await FileSystem.getInfoAsync(localPath);
        if (info.exists) return;
        await FileSystem.downloadAsync(remoteUri, localPath);
    } catch {
        // Silent — video just keeps streaming from remote next time too
    }
}
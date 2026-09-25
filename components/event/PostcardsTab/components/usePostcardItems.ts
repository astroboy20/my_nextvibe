import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import Toast from "react-native-toast-message";
import type { CapturedMedia } from "../PostcardCamera";

const MAX_ITEMS = 20;

export interface PickedItem {
    uri: string;
    type: "image" | "video";
    mimeType?: string;
    fileName?: string;
}

export function usePostcardItems() {
    const [items, setItems] = useState<PickedItem[]>([]);
    const [activeIdx, setActiveIdx] = useState(0);

    const addItems = (newItems: PickedItem[]) => {
        const prevLen = items.length;
        const next = [...items, ...newItems].slice(0, MAX_ITEMS);
        setItems(next);
        setActiveIdx(prevLen);
        return next;
    };

    const openGallery = async (
        onBeforePick: () => void,
        onAfterPick: () => void
    ) => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Toast.show({ type: "error", text1: "Media library permission denied" });
            return null;
        }
        const remaining = MAX_ITEMS - items.length;
        if (remaining <= 0) {
            Toast.show({ type: "info", text1: `Max ${MAX_ITEMS} items reached` });
            return null;
        }

        onBeforePick();
        await new Promise<void>((resolve) => setTimeout(resolve, 350));

        let result: ImagePicker.ImagePickerResult;
        try {
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images", "videos"] as any,
                allowsMultipleSelection: true,
                selectionLimit: remaining,
                quality: 0.85,
                videoMaxDuration: 125,
                orderedSelection: true,
            });
        } finally {
            onAfterPick();
        }

        if (result.canceled) return null;
        const newItems: PickedItem[] = result.assets.map((a) => ({
            uri: a.uri,
            type: a.type === "video" ? "video" : "image",
            mimeType: a.mimeType,
            fileName: a.fileName ?? undefined,
        }));
        return addItems(newItems);
    };

    const addFromCamera = (captured: CapturedMedia[]) => {
        if (!captured.length) return null;
        const newItems: PickedItem[] = captured.map((c) => ({
            uri: c.uri,
            type: c.type,
            mimeType: c.mimeType,
        }));
        return addItems(newItems);
    };

    const removeItem = (idx: number, onEmpty: () => void) => {
        const next = items.filter((_, i) => i !== idx);
        if (next.length === 0) {
            setItems([]);
            onEmpty();
        } else {
            setItems(next);
            setActiveIdx((prev) => Math.min(prev, next.length - 1));
        }
    };

    const reset = () => {
        setItems([]);
        setActiveIdx(0);
    };

    return {
        items,
        activeIdx,
        setActiveIdx,
        openGallery,
        addFromCamera,
        removeItem,
        reset,
        MAX_ITEMS,
    };
}
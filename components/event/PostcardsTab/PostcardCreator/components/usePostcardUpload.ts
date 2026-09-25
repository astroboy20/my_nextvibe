import { useState } from "react";
import { Platform } from "react-native";
import Toast from "react-native-toast-message";
import { File as EFSFile, Paths } from "expo-file-system";
import {
  useCreatePostcardsMutation,
  useSwapPostcardMutation,
} from "@/store/api/eventsApi";
import { API_URL, tokenStore } from "@/store/baseQuery";
import type { PickedItem } from "./usePostcardItems";
import { stampOverlay } from "./stampOverlay";

interface UploadArgs {
  items: PickedItem[];
  eventId?: string;
  vibeTagId?: string;
  caption: string;
  overlayUrl: string | null;
}

const dataUriToTempFile = async (
  dataUri: string,
  fileName: string
): Promise<string> => {
  const commaIdx = dataUri.indexOf(",");
  const base64 = dataUri.slice(commaIdx + 1);
  const tempFile = new EFSFile(Paths.cache, fileName);
  tempFile.write(base64, { encoding: "base64" });
  return tempFile.uri;
};

export function usePostcardUpload() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<"stamping" | "uploading" | "saving">("stamping");

  const [createPostcards] = useCreatePostcardsMutation();
  const [swapPostcard] = useSwapPostcardMutation();

  const submit = async (
    args: UploadArgs,
    opts: {
      targetSwapId?: string;
      onSuccess: () => void;
      onAuthExpired: () => void;
    }
  ) => {
    const { items, eventId, vibeTagId, caption, overlayUrl } = args;
    const { targetSwapId, onSuccess, onAuthExpired } = opts;

    if (!items.length || !eventId) return;
    setIsSubmitting(true);
    setUploadProgress(0);
    setUploadStage("stamping");

    try {
      setUploadProgress(5);
      const stamped = await Promise.all(
        items.map((item) => stampOverlay(item.uri, item.type, overlayUrl))
      );
      setUploadProgress(15);
      const token = await tokenStore.get("accessToken");
      const formData = new FormData();

      for (let i = 0; i < stamped.length; i++) {
        const result = stamped[i];
        const original = items[i];

        if (original.type === "video") {
          const videoName =
            original.fileName ?? `postcard-video-${Date.now()}-${i}.mp4`;
          (formData as any).append("files", {
            uri: result.uri,
            name: videoName,
            type: "video/mp4",
          } as any);

          if (result.thumbnailUri) {
            const thumbFileName = `postcard-thumb-${Date.now()}-${i}.jpg`;
            let thumbUri = result.thumbnailUri;
            if (thumbUri.startsWith("data:")) {
              thumbUri = await dataUriToTempFile(thumbUri, thumbFileName);
            }
            (formData as any).append("files", {
              uri: thumbUri,
              name: thumbFileName,
              type: "image/jpeg",
            } as any);
          }
        } else {
          const mime = result.mimeType;
          const ext = mime === "image/png" ? "png" : "jpg";
          const name = original.fileName
            ? original.fileName.replace(/\.(jpg|jpeg)$/i, `.${ext}`)
            : `postcard-photo-${Date.now()}-${i}.${ext}`;

          let uploadUri = result.uri;
          if (uploadUri.startsWith("data:")) {
            uploadUri = await dataUriToTempFile(uploadUri, name);
          } else if (Platform.OS === "ios" && uploadUri.startsWith("file://")) {
            uploadUri = uploadUri.replace("file://", "");
          }

          (formData as any).append("files", {
            uri: uploadUri,
            name,
            type: mime,
          } as any);
        }
      }

      setUploadStage("uploading");
      setUploadProgress(20);

      const uploadResult = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_URL}/v1/storage/upload-multiple`);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setUploadProgress(20 + Math.round((e.loaded / e.total) * 65));
        };
        xhr.onload = () => {
          if (xhr.status === 401) {
            reject(Object.assign(new Error("Unauthorized"), { status: 401 }));
            return;
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error("Invalid response"));
            }
          } else {
            try {
              reject(
                new Error(
                  JSON.parse(xhr.responseText)?.message || "Upload failed"
                )
              );
            } catch {
              reject(new Error("Upload failed"));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(formData);
        setUploadProgress((prev) => Math.max(prev, 50));
      });

      const uploadedFiles = uploadResult?.data ?? [];
      let uploadIdx = 0;
      const uploaded = stamped.map((result, i) => {
        const original = items[i];

        if (original.type === "video") {
          const videoFile = uploadedFiles[uploadIdx++];
          const thumbnailFile = result.thumbnailUri
            ? uploadedFiles[uploadIdx++]
            : null;

          return {
            fileKey: videoFile?.fileKey,
            mediaType: "VIDEO",
            mediaUrl: videoFile?.url,
            thumbnailKey: thumbnailFile?.fileKey ?? null,
            vibeTagOverlayUrl: result.vibeTagOverlayUrl ?? null,
          };
        } else {
          const photoFile = uploadedFiles[uploadIdx++];
          return {
            fileKey: photoFile?.fileKey,
            mediaType: "PHOTO",
            mediaUrl: photoFile?.url,
            vibeTagOverlayUrl: null,
          };
        }
      });

      if (!uploaded.length) {
        Toast.show({ type: "error", text1: "Upload failed" });
        setIsSubmitting(false);
        return;
      }

      setUploadStage("saving");
      setUploadProgress(90);
      if (targetSwapId) {
        await swapPostcard({
          postcardId: targetSwapId,
          eventId,
          vibeTagId,
          media: uploaded,
          caption,
        }).unwrap();
      } else {
        await createPostcards({
          eventId,
          vibeTagId,
          media: uploaded,
          caption,
        }).unwrap();
      }

      setUploadProgress(100);
      Toast.show({
        type: "success",
        text1: targetSwapId
          ? "Postcard replaced!"
          : `${items.length} item${items.length > 1 ? "s" : ""} posted!`,
      });
      onSuccess();
    } catch (err: any) {
      const status = err?.status ?? err?.data?.statusCode;

      if (status === 401) {
        onAuthExpired();
        return; // isSubmitting stays true — caller's auth modal takes over
      }

      if (targetSwapId && status === 403) {
        Toast.show({
          type: "error",
          text1: "You can only replace your own postcards.",
        });
      } else if (targetSwapId && status === 404) {
        Toast.show({ type: "error", text1: "That postcard no longer exists." });
      } else {
        Toast.show({
          type: "error",
          text1: err?.data?.message ?? err?.message ?? "Post failed.",
        });
      }

      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return { isSubmitting, uploadProgress, uploadStage, submit, setIsSubmitting, setUploadProgress };
}
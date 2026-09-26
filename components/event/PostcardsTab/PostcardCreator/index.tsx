import AuthModal from "@/components/auth/AuthModal";
import { useAuthModal } from "@/hooks/useAuthModal";
import React, { useRef, useState } from "react";
import { Animated, Dimensions, Modal, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PostcardCamera, type CapturedMedia } from "../PostcardCamera";
import { ChooseStage } from "./components/ChooseStage";
import { ReviewStage } from "./components/ReviewStage";
import { s } from "./components/styles";
import { SwapPicker } from "./components/Swap";
import { usePostcardItems } from "./components/usePostcardItems";
import { usePostcardUpload } from "./components/usePostcardUpload";

const { height: H } = Dimensions.get("window");

interface VibeTagOverlay {
  imageUrl: string;
  name: string;
}

export interface PostcardCreatorProps {
  vibeTagName?: string;
  vibeTagOverlay?: VibeTagOverlay | null;
  vibeTagId?: string;
  eventName?: string;
  eventId?: string;
  onClose: () => void;
  onSubmit?: () => void;
  userPostcardCount?: number;
  swapPostcardId?: string;
  swapLikeCount?: number;
  swapCommentCount?: number;
}

export function PostcardCreator({
  vibeTagName = "Event VibeTag",
  vibeTagOverlay,
  vibeTagId,
  eventName = "Event",
  eventId,
  onClose,
  onSubmit,
  userPostcardCount = 0,
  swapPostcardId,
  swapLikeCount = 0,
  swapCommentCount = 0,
}: PostcardCreatorProps) {
  const isSwapMode = !!swapPostcardId;

  type Stage = "choose" | "review";
  const [stage, setStage] = useState<Stage>("choose");
  const [caption, setCaption] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [creatorVisible, setCreatorVisible] = useState(true);
  const [showSwapPicker, setShowSwapPicker] = useState(false);
  const [showSwapConfirm, setShowSwapConfirm] = useState(false);
  const [pendingSwap, setPendingSwap] = useState<any>(null);

  const {
    visible: authModalVisible,
    showAuthModal,
    hideAuthModal,
  } = useAuthModal();
  const pendingSubmitSwapRef = useRef<string | undefined>(undefined);

  const slideAnim = useRef(new Animated.Value(H)).current;

  const {
    items,
    activeIdx,
    setActiveIdx,
    openGallery,
    addFromCamera,
    removeItem,
    reset,
    MAX_ITEMS,
  } = usePostcardItems();

  const { isSubmitting, uploadProgress, uploadStage, submit } =
    usePostcardUpload();

  const slideInReview = () => {
    setStage("review");
    slideAnim.setValue(H);
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const handleGallery = async () => {
    const result = await openGallery(
      () => setCreatorVisible(false),
      () => setCreatorVisible(true)
    );
    if (result) slideInReview();
  };

  const handleCameraOpen = () => {
    setCreatorVisible(false);
    setShowCamera(true);
  };

  const handleCameraCapture = (captured: CapturedMedia[]) => {
    setShowCamera(false);
    setCreatorVisible(true);
    const result = addFromCamera(captured);
    if (result) slideInReview();
  };

  const doSubmit = (targetSwapId?: string) => {
    submit(
      {
        items,
        eventId,
        vibeTagId,
        caption,
        overlayUrl: vibeTagOverlay?.imageUrl ?? null,
      },
      {
        targetSwapId,
        onSuccess: () => {
          onSubmit?.();
          onClose();
        },
        onAuthExpired: () => {
          pendingSubmitSwapRef.current = targetSwapId;
          showAuthModal();
        },
      }
    );
  };

  const handlePost = () => {
    if (!items.length) return;
    if (isSwapMode) {
      setShowSwapConfirm(true);
      return;
    }
    if (userPostcardCount >= MAX_ITEMS) {
      setShowSwapPicker(true);
      return;
    }
    doSubmit();
  };

  return (
    <>
      <Modal
        visible={creatorVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={{ flex: 1 }}>
          <SafeAreaView style={s.root} edges={["top", "bottom"]}>
            {stage === "choose" && (
              <ChooseStage
                isSwapMode={isSwapMode}
                vibeTagOverlay={vibeTagOverlay}
                vibeTagName={vibeTagName}
                eventName={eventName}
                maxItems={MAX_ITEMS}
                onClose={onClose}
                onOpenCamera={handleCameraOpen}
                onOpenGallery={handleGallery}
              />
            )}

            {stage === "review" && (
              <ReviewStage
                slideAnim={slideAnim}
                isSwapMode={isSwapMode}
                items={items}
                activeIdx={activeIdx}
                maxItems={MAX_ITEMS}
                vibeTagOverlay={vibeTagOverlay}
                caption={caption}
                onCaptionChange={setCaption}
                isSubmitting={isSubmitting}
                uploadStage={uploadStage}
                uploadProgress={uploadProgress}
                onBack={() => {
                  setStage("choose");
                  reset();
                }}
                onSelect={setActiveIdx}
                onRemove={(idx) => removeItem(idx, () => setStage("choose"))}
                onAddCamera={handleCameraOpen}
                onAddGallery={handleGallery}
                onPost={handlePost}
                onStartOver={() => {
                  setStage("choose");
                  reset();
                  setCaption("");
                }}
                showSwapConfirm={showSwapConfirm}
                pendingSwap={pendingSwap}
                swapLikeCount={swapLikeCount}
                swapCommentCount={swapCommentCount}
                swapPostcardId={swapPostcardId}
                onSwapCancel={() => {
                  setShowSwapConfirm(false);
                  setPendingSwap(null);
                }}
                onSwapConfirm={() =>
                  doSubmit(pendingSwap?.id ?? swapPostcardId)
                }
              />
            )}
          </SafeAreaView>

          {showSwapPicker && eventId && (
            <SwapPicker
              eventId={eventId}
              onPick={(p) => {
                setPendingSwap(p);
                setShowSwapPicker(false);
                setShowSwapConfirm(true);
              }}
              onCancel={() => setShowSwapPicker(false)}
            />
          )}

          <AuthModal
            visible={authModalVisible}
            onDismiss={() => {
              hideAuthModal();
              pendingSubmitSwapRef.current = undefined;
            }}
            onSuccess={() => {
              hideAuthModal();
              const swapTarget = pendingSubmitSwapRef.current;
              pendingSubmitSwapRef.current = undefined;
              doSubmit(swapTarget);
            }}
            message="Your session expired. Sign in to post your postcard."
          />
        </View>
      </Modal>

      {showCamera && (
        <Modal
          visible={showCamera}
          animationType="slide"
          statusBarTranslucent
          hardwareAccelerated
        >
          <PostcardCamera
            vibeTagOverlay={vibeTagOverlay}
            vibeTagName={vibeTagName}
            onCapture={handleCameraCapture}
            onClose={() => {
              setShowCamera(false);
              setCreatorVisible(true);
            }}
          />
        </Modal>
      )}
    </>
  );
}

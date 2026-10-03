import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import {
  useCommentOnPostcardMutation,
  useGetPostcardCommentsQuery,
} from "@/store/api/eventsApi";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { Avatar } from "../ui/Avatar";

export function CommentSheet({
  postcardId,
  onClose,
}: {
  postcardId: string;
  onClose: () => void;
}) {
  const [body, setBody] = useState("");
  const [postComment, { isLoading: isPosting }] =
    useCommentOnPostcardMutation();
  const {
    data: commentsData,
    isLoading,
    refetch,
  } = useGetPostcardCommentsQuery(postcardId);
  const comments = commentsData?.data ?? [];

  const submit = async () => {
    const t = body.trim();
    if (!t) return;
    setBody("");
    try {
      await postComment({ postcardId, content: t }).unwrap();
      refetch();
    } catch {
      setBody(t);
      Toast.show({ type: "error", text1: "Could not post comment" });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          Comments{comments.length > 0 ? ` (${comments.length})` : ""}
        </Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={22} color={neutral[700]} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={brand.primary} />
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No comments yet. Be the first!</Text>
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16, gap: 14 }}
          renderItem={({ item: c }) => {
            const name = c.author?.displayName ?? c.author?.username ?? "User";

            return (
              <View style={styles.row}>
                <Avatar
                  uri={c.author?.avatarUrl}
                  name={name}
                  size={34}
                  variant="light"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={styles.content}>{c.content}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Add a comment…"
          placeholderTextColor={neutral[400]}
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={submit}
          autoFocus
        />
        <TouchableOpacity
          onPress={submit}
          disabled={!body.trim() || isPosting}
          style={[styles.send, (!body.trim() || isPosting) && { opacity: 0.4 }]}
          activeOpacity={0.8}
        >
          {isPosting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={16} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: neutral[800],
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[400],
  },
  row: { flexDirection: "row", gap: 10 },
  name: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  content: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[700],
    marginTop: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: neutral[200],
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: neutral[100],
    paddingHorizontal: 14,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: neutral[800],
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});

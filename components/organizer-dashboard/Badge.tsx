
import { semantic } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import React from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";


const StatusBadge = ({ status }: { status: string }) => {
  const isPublished = status === "PUBLISHED";
  return (
    <View
      style={[
        badge.pill,
        {
          backgroundColor: isPublished
            ? `${semantic.success}18`
            : `${semantic.warning}18`,
        },
      ]}
    >
      <Text
        style={[
          badge.text,
          {
            color: isPublished ? semantic.success : semantic.warning,
          },
        ]}
      >
        {status}
      </Text>
    </View>
  );
};

const badge = StyleSheet.create({
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  text: { fontFamily: fontFamily.semibold, fontSize: 11 },
});


export default StatusBadge;
import { Skeleton } from "@/components/ui/Skeleton";
import { neutral } from "@/constants/Colors";
import React from "react";
import { StyleSheet, View } from "react-native";

//  PostcardSkeleton 

export function PostcardSkeleton() {
  return (
    <View style={styles.card}>
      {/* author row */}
      <View style={styles.authorRow}>
        <Skeleton width={38} height={38} borderRadius={19} />
        <View style={{ flex: 1 }}>
          <Skeleton width="40%" height={12} borderRadius={6} />
          <Skeleton
            width="25%"
            height={10}
            borderRadius={5}
            style={{ marginTop: 5 }}
          />
        </View>
        <Skeleton width={30} height={10} borderRadius={5} />
      </View>
      {/* image */}
      <Skeleton width="100%" height={260} borderRadius={0} />
      {/* actions */}
      <View style={styles.actionsRow}>
        <Skeleton width={50} height={12} borderRadius={6} />
        <Skeleton width={50} height={12} borderRadius={6} />
      </View>
      {/* caption */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
        <Skeleton width="80%" height={11} borderRadius={5} />
        <Skeleton
          width="55%"
          height={11}
          borderRadius={5}
          style={{ marginTop: 5 }}
        />
      </View>
    </View>
  );
}

//  PersonSkeleton 

export function PersonSkeleton() {
  return (
    <View style={styles.personCard}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={{ flex: 1 }}>
        <Skeleton width="50%" height={13} borderRadius={6} />
        <Skeleton
          width="35%"
          height={10}
          borderRadius={5}
          style={{ marginTop: 6 }}
        />
      </View>
      <Skeleton width={88} height={32} borderRadius={20} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[100],
    overflow: "hidden",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  personCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[100],
    padding: 14,
  },
});

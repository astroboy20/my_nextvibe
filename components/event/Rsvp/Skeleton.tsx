
import { neutral } from "@/constants/Colors";
import { View } from "react-native";

import React from "react";

const Bone: React.FC<{
  w: number | string;
  h: number;
  radius?: number;
  style?: any;
}> = ({ w, h, radius = 8, style = {} }) => {
  return (
    <View
      style={[
        {
          width: w as any,
          height: h,
          borderRadius: radius,
          backgroundColor: neutral[100],
        },
        style,
      ]}
    />
  );
};

// ─── Ticket modal skeletons ───────────────────────────────────────────────────

function TicketSkeleton() {
  return (
    <View style={{ gap: 10 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: neutral[200],
            padding: 14,
            gap: 8,
            backgroundColor: "#fff",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ gap: 6, flex: 1 }}>
              <Bone w="55%" h={14} />
              <Bone w="38%" h={11} />
              <Bone w="28%" h={11} />
            </View>
            <Bone w={64} h={28} radius={20} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Attendee skeleton ────────────────────────────────────────────────────────

function AttendeeSkeleton() {
  return (
    <View style={{ gap: 10 }}>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: neutral[100],
          }}
        >
          <Bone w={38} h={38} radius={19} />
          <View style={{ flex: 1, gap: 6 }}>
            <Bone w="50%" h={13} />
            <Bone w="30%" h={10} />
          </View>
          <Bone w={56} h={24} radius={20} />
        </View>
      ))}
    </View>
  );
}


export { TicketSkeleton, AttendeeSkeleton, Bone };

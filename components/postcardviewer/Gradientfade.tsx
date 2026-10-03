import React from "react";
import { Dimensions, View } from "react-native";

const { height: H } = Dimensions.get("window");

/**
 * Two stacked Views faking a top-transparent → bottom-dark gradient, sitting
 * under the bottom info overlay so caption/author text stays readable over
 * any media.
 */
export function GradientFade() {
  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: H * 0.55,
      }}
      pointerEvents="none"
    >
      {[0.0, 0.05, 0.12, 0.22, 0.38, 0.55, 0.72].map((op, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: `rgba(0,0,0,${op})`,
          }}
        />
      ))}
    </View>
  );
}

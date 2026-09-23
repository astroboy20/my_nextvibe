import { brand } from "@/constants/Colors";
import { fontFamily } from "@/constants/Typography";
import { Text, View, Image, StyleSheet } from "react-native";

const Avatar =({ name, avatarUrl, size = 38 }:any) => {
  return (
    <View
      style={[av.circle, { width: size, height: size, borderRadius: size / 2 }]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={[av.text, { fontSize: size * 0.38 }]}>
          {name.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

export default Avatar;

const av = StyleSheet.create({
  circle: {
    backgroundColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontFamily: fontFamily.bold, color: "#fff" },
});

import { brand } from "@/constants/Colors";
import { fontFamily } from "@/constants/Typography";
import { Image, StyleSheet, Text, View } from "react-native";

const OrgAvatar = ({
  uri,
  name,
  size = 44,
}: {
  uri?: string | null;
  name: string;
  size?: number;
}) => {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${brand.primary}20`,
        }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View
      style={[
        avatarStyle.orgAvatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[avatarStyle.orgAvatarText, { fontSize: size * 0.38 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
};

export default OrgAvatar;

const avatarStyle = StyleSheet.create({
  orgAvatarFallback: {
    backgroundColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  orgAvatarText: { fontFamily: fontFamily.bold, color: "#fff" },
});

import { brand, neutral } from "@/constants/Colors";
import { fontFamily, fontSize } from "@/constants/Typography";
import { useAuth } from "@/hooks/useAuth";
import { useToggleFollowMutation } from "@/store/api/socialApi";
import { Ionicons } from "@expo/vector-icons";
import {
    StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";


const InfoRow = ({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  onPress?: () => void;
})=> {
  return (
    <TouchableOpacity
      style={infoStyle.infoRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={infoStyle.infoIcon}>
        <Ionicons name={icon} size={18} color={brand.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={infoStyle.infoLabel}>{label}</Text>
        <Text style={[infoStyle.infoValue, onPress && { color: brand.primary }]}>
          {value}
        </Text>
      </View>
      {onPress && (
        <Ionicons name="open-outline" size={14} color={brand.primary} />
      )}
    </TouchableOpacity>
  );
}

export default InfoRow;

const infoStyle = StyleSheet.create({
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
      },
      infoIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: `${brand.primary}10`,
        alignItems: "center",
        justifyContent: "center",
      },
      infoLabel: {
        fontFamily: fontFamily.semibold,
        fontSize: 11,
        color: neutral[500],
      },
      infoValue: {
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.sm,
        color: neutral[800],
        marginTop: 1,
      },
})
import * as Updates from "expo-updates";
import { Alert } from "react-native";

export default async function checkForUpdate() {
    // expo-updates only works in production/preview builds, not in Expo Go or dev client
    if (__DEV__) return;

    try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            Alert.alert("Update available", "Restart to get the latest version?", [
                { text: "Later" },
                { text: "Restart", onPress: () => Updates.reloadAsync() },
            ]);
        }
    } catch (e) {
        // network failure etc — fail silently, don't block app usage
        console.warn("[OTA] checkForUpdate failed:", e);
    }
}
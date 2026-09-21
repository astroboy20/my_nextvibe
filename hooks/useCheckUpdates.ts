import * as Updates from "expo-updates";
import { Alert } from "react-native";

export default async function checkForUpdate() {
    try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            // show your own Alert/Toast prompting a reload
            Alert.alert("Update available", "Restart to get the latest version?", [
                { text: "Later" },
                { text: "Restart", onPress: () => Updates.reloadAsync() },
            ]);
        }
    } catch (e) {
        // network failure etc — fail silently, don't block app usage
    }
}
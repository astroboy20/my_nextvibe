import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

/**
 * Single shared listener — call this once (in PostcardViewer) and pass the
 * result down as props, rather than subscribing per-card. Several cards can
 * be mounted at once inside the FlatList's render window, and each one
 * subscribing separately would mean N duplicate NetInfo listeners.
 */
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [isWifi, setIsWifi] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected !== false);
      setIsWifi(state.type === "wifi");
    });
    return () => unsubscribe();
  }, []);

  return { isConnected, isWifi };
}
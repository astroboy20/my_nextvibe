import { registerForPush } from "@/services/pushNotifications";
import { tokenStore } from "@/store/baseQuery";
import { useEffect, useRef } from "react";

/** Registers the device for push once, right after sign-in. */
export function usePushRegistration(isAuthenticated: boolean, isBootstrapped: boolean) {
    const pushRef = useRef<boolean | null>(null);

    useEffect(() => {
        if (!isBootstrapped) return;
        if (!isAuthenticated) { pushRef.current = false; return; }
        if (pushRef.current === isAuthenticated) return;
        pushRef.current = isAuthenticated;

        (async () => {
            try {
                const accessToken = await tokenStore.get("accessToken");
                if (accessToken) await registerForPush(accessToken);
            } catch {
                /* push failure must never crash the app */
            }
        })();
    }, [isAuthenticated, isBootstrapped]);
}
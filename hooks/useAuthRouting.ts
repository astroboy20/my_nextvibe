import type { RootState } from "@/store/store";
import { useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

/** Redirects between (auth) and (tabs) based on auth state. Blocks while OAuth is exchanging. */
export function useAuthRouting() {
    const router = useRouter();
    const segments = useSegments();
    const { isAuthenticated, isBootstrapped, isNewUser, oauthPending } = useSelector(
        (s: RootState) => s.auth
    );

    const navigationInProgress = useRef(false);
    const lastRoute = useRef<string | null>(null);
    const prevOauthPending = useRef(false);

    useEffect(() => {
        const wasOauthPending = prevOauthPending.current;
        prevOauthPending.current = oauthPending;
        if (!isBootstrapped || oauthPending) return;

        if (wasOauthPending) {
            lastRoute.current = null;
            navigationInProgress.current = false;
        }

        const inAuthGroup = segments[0] === "(auth)";
        const inOnboarding = inAuthGroup && segments[1] === "onboarding";
        const inOAuthCb = segments[0] === "auth";

        const targetRoute = isAuthenticated && isNewUser && !inOnboarding
            ? "/(auth)/onboarding/vibes"
            : isAuthenticated && !isNewUser && (inAuthGroup || inOAuthCb)
                ? "/(tabs)"
                : !isAuthenticated && !inAuthGroup && !inOAuthCb
                    ? "/(auth)/login"
                    : null;

        if (targetRoute && targetRoute !== lastRoute.current && !navigationInProgress.current) {
            navigationInProgress.current = true;
            lastRoute.current = targetRoute;
            router.replace(targetRoute as any);
            setTimeout(() => { navigationInProgress.current = false; }, 100);
        }
    }, [isAuthenticated, isBootstrapped, isNewUser, oauthPending, segments, router]);

    return { oauthPending };
}
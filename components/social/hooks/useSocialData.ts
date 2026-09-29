import { type SocialUser } from "@/components/social/PersonCard";
import { type PostcardItem } from "@/components/social/PostcardCard";
import {
    useGetFollowingFeedQuery,
    useGetMutualsQuery,
    useGetMyFollowersQuery,
    useGetMyFollowingQuery,
} from "@/store/api/socialApi";
import { useMemo } from "react";
import { PeopleTab } from "../Peoplesubtabs";
import { normalizeFeedItem } from "./Normalizefeeditem";

interface UseSocialDataArgs {
    mainTab: "feed" | "people";
    peopleTab: PeopleTab;
    search: string;
}

export function useSocialData({ mainTab, peopleTab, search }: UseSocialDataArgs) {
    //  Feed API 
    const {
        data: feedData,
        isLoading: feedLoading,
        isFetching: feedFetching,
        refetch: refetchFeed,
    } = useGetFollowingFeedQuery(
        { page: 1, limit: 20 },
        { skip: mainTab !== "feed" }
    );

    //  People API 
    const {
        data: followingData,
        isLoading: followingLoading,
        refetch: refetchFollowing,
    } = useGetMyFollowingQuery(undefined, {
        skip: mainTab !== "people" || peopleTab !== "following",
    });

    const {
        data: followersData,
        isLoading: followersLoading,
        refetch: refetchFollowers,
    } = useGetMyFollowersQuery(undefined, {
        skip: mainTab !== "people" || peopleTab !== "followers",
    });

    const {
        data: mutualsData,
        isLoading: mutualsLoading,
        refetch: refetchMutuals,
    } = useGetMutualsQuery(undefined, {
        skip: mainTab !== "people" || peopleTab !== "mutuals",
    });

    //  Derived 
    const feedItems: PostcardItem[] = useMemo(
        () => (feedData?.data?.data ?? []).map(normalizeFeedItem),
        [feedData]
    );

    const peopleMap: Record<PeopleTab, SocialUser[]> = {
        following: followingData?.data?.data ?? [],
        followers: followersData?.data?.data ?? [],
        mutuals: mutualsData?.data?.data ?? [],
    };

    const currentPeopleLoading =
        (peopleTab === "following" && followingLoading && !followingData) ||
        (peopleTab === "followers" && followersLoading && !followersData) ||
        (peopleTab === "mutuals" && mutualsLoading && !mutualsData);

    const isFeedFirstLoad = feedLoading && !feedData;
    const isRefreshing = feedFetching && !!feedData;

    const filteredPeople = useMemo(() => {
        const list = peopleMap[peopleTab] ?? [];
        if (!search) return list;
        const q = search.toLowerCase();
        return list.filter(
            (u) =>
                (u.displayName ?? "").toLowerCase().includes(q) ||
                (u.username ?? "").toLowerCase().includes(q)
        );
    }, [peopleMap, peopleTab, search]);

    const refetchPeople = () => {
        if (peopleTab === "following") refetchFollowing();
        else if (peopleTab === "followers") refetchFollowers();
        else refetchMutuals();
    };

    return {
        feedItems,
        isFeedFirstLoad,
        isRefreshing,
        refetchFeed,
        filteredPeople,
        currentPeopleLoading,
        refetchPeople,
    };
}
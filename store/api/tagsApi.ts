/**
 * store/api/tagsApi.ts
 *
 * Compatibility shim — re-exports vibe-tag hooks from discoverApi under the
 * names that the onboarding screen and EventTagsEditor component expect.
 */

export {

    // tagsApi object — needed by useAuth.ts resetApiState
    discoverApi as tagsApi,
    // components/edit-event/EventTagsEditor.tsx → useGetAllTagsQuery (same alias)
    // components/edit-event/EventTagsEditor.tsx → useCreateTagMutation
    useCreateDiscoverTagMutation as useCreateTagMutation,
    // vibe-onboarding.tsx → useGetAllTagsQuery
    useGetVibeTagsQuery as useGetAllTagsQuery
} from "./discoverApi";

export type { VibeTag } from "./discoverApi";

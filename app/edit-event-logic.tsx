// "use client";
// import { Button } from "@/components/ui/button";
// import { Card } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import {
//   Users,
//   Gamepad2,
//   Tag,
//   BarChart3,
//   QrCode,
//   Share2,
//   ExternalLink,
//   Ticket,
//   Image as ImageIcon,
//   X,
//   CheckCircle2,
//   XCircle,
//   StopCircle,
//   ChevronDown,
//   Bell,
//   Edit2,
//   Lock,
//   Plus,
//   Loader2,
//   Video,
// } from "lucide-react";
// import { EventDashboardCard } from "./components/event-dashboard-card";
// import { RSVPTrackerContent } from "./components/rsvp-tracker-content";
// import { TicketCreatorEnhanced } from "./components/tracker-creator-enhanced";
// // import { RecentPurchasesContent } from "./components/recent-purchases-content";
// import { GamificationHubContent } from "./components/gamification-hub-content";
// import { PaymentModule } from "./components/payment-module";
// import EventRemindersContent from "./components/event-reminders-content";
// import Image from "next/image";
// // import AnalyticsPanelContent from "./components/analytics-panel";
// import VibeTagStudioContent from "./components/vibe-tag-studio";
// // import PostcardLeaderboardContent from "./components/leaderboard-content";
// import {
//   useGetEventDetailsQuery,
//   useGetGamesQuery,
//   useUpdateEventStatusMutation,
//   useUpdateEventMutation,
//   useAddEventTagsMutation,
//   useRemoveEventTagsMutation,
//   useUploadIntentMutation,
// } from "@/app/provider/api/eventApi";
// import {
//   useGetVibeTagsQuery as useGetDiscoverTagsQuery,
//   useCreateDiscoverTagMutation,
// } from "@/app/provider/api/discoverApi";
// import { useDispatch } from "react-redux";
// import { setHideHeader } from "@/app/provider/slices/ui-slice";
// import { useGetRemindersQuery } from "@/app/provider/api/reminderApi";
// import { AccessKeyDisplay } from "@/components/private-event-guard";
// import { formatDate, formatTime } from "@/hooks/format-date";
// import Link from "next/link";
// import { Skeleton } from "@/components/ui/skeleton";
// import { useEffect, useRef, useState } from "react";
// import { QRCodeSVG } from "qrcode.react";
// import { toast } from "sonner";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";

// // ── helpers ───────────────────────────────────────────────────────────────────

// /** Returns true when the event has already started (startsAt <= now) */
// function isEventStarted(startsAt?: string | null): boolean {
//   if (!startsAt) return false;
//   return new Date(startsAt).getTime() <= Date.now();
// }

// // ── Event Edit Modal ──────────────────────────────────────────────────────────

// type UploadState = {
//   status: "idle" | "uploading" | "done" | "error";
//   progress: number;
//   url: string | null;
// };
// const UPLOAD_IDLE: UploadState = { status: "idle", progress: 0, url: null };

// const MAX_FLIER_SIZE = 10 * 1024 * 1024;
// const MAX_VIDEO_SIZE = 350 * 1024 * 1024;
// const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
// const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

// function uploadFileToCDN(
//   file: File,
//   uploadUrl: string,
//   onProgress?: (pct: number) => void
// ): Promise<void> {
//   return new Promise((resolve, reject) => {
//     const xhr = new XMLHttpRequest();
//     xhr.open("PUT", uploadUrl);
//     xhr.setRequestHeader("Content-Type", file.type);
//     if (onProgress) {
//       xhr.upload.onprogress = (e) => {
//         if (e.lengthComputable)
//           onProgress(Math.round((e.loaded * 100) / e.total));
//       };
//     }
//     xhr.onload = () =>
//       xhr.status >= 200 && xhr.status < 300
//         ? resolve()
//         : reject(new Error(`Upload failed: ${xhr.status}`));
//     xhr.onerror = () => reject(new Error("Upload network error"));
//     xhr.send(file);
//   });
// }

// function EventEditModal({
//   event,
//   open,
//   onOpenChange,
// }: {
//   event: any;
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
// }) {
//   const dispatch = useDispatch();
//   const [updateEvent, { isLoading: isSaving }] = useUpdateEventMutation();
//   const [uploadIntent] = useUploadIntentMutation();

//   // Hide the app header while modal is open
//   useEffect(() => {
//     dispatch(setHideHeader(open));
//     return () => {
//       dispatch(setHideHeader(false));
//     };
//   }, [open, dispatch]);

//   // Once the event has started, ALL editing is disabled
//   const locked = isEventStarted(event?.startsAt);

//   const [form, setForm] = useState({
//     name: event?.name ?? "",
//     description: event?.description ?? "",
//     locationName: event?.locationName ?? "",
//     virtualLink: event?.virtualLink ?? "",
//     capacity: event?.capacity ? String(event.capacity) : "",
//     startsAt: event?.startsAt
//       ? new Date(event.startsAt).toISOString().slice(0, 16)
//       : "",
//     endsAt: event?.endsAt
//       ? new Date(event.endsAt).toISOString().slice(0, 16)
//       : "",
//   });

//   const [flierUpload, setFlierUpload] = useState<UploadState>(
//     event?.flierUrl
//       ? { status: "done", progress: 100, url: event.flierUrl }
//       : UPLOAD_IDLE
//   );
//   const [videoUpload, setVideoUpload] = useState<UploadState>(
//     event?.promoVideoUrl
//       ? { status: "done", progress: 100, url: event.promoVideoUrl }
//       : UPLOAD_IDLE
//   );

//   const flierInputRef = useRef<HTMLInputElement>(null);
//   const videoInputRef = useRef<HTMLInputElement>(null);

//   // Reset form state when dialog opens
//   useEffect(() => {
//     if (open) {
//       setForm({
//         name: event?.name ?? "",
//         description: event?.description ?? "",
//         locationName: event?.locationName ?? "",
//         virtualLink: event?.virtualLink ?? "",
//         capacity: event?.capacity ? String(event.capacity) : "",
//         startsAt: event?.startsAt
//           ? new Date(event.startsAt).toISOString().slice(0, 16)
//           : "",
//         endsAt: event?.endsAt
//           ? new Date(event.endsAt).toISOString().slice(0, 16)
//           : "",
//       });
//       setFlierUpload(
//         event?.flierUrl
//           ? { status: "done", progress: 100, url: event.flierUrl }
//           : UPLOAD_IDLE
//       );
//       setVideoUpload(
//         event?.promoVideoUrl
//           ? { status: "done", progress: 100, url: event.promoVideoUrl }
//           : UPLOAD_IDLE
//       );
//     }
//   }, [open, event]);

//   const handleFlierChange = async (file: File) => {
//     if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
//       toast.warning("Please upload a PNG, JPEG, or WebP image.");
//       return;
//     }
//     if (file.size > MAX_FLIER_SIZE) {
//       toast.warning("Flyer must be 10 MB or less.");
//       return;
//     }
//     setFlierUpload({ status: "uploading", progress: 0, url: null });
//     try {
//       const intent = await uploadIntent({
//         filename: file.name,
//         contentType: file.type,
//         folder: "events",
//       }).unwrap();
//       await uploadFileToCDN(file, intent.data.uploadUrl, (pct) =>
//         setFlierUpload((p) => ({ ...p, progress: pct }))
//       );
//       setFlierUpload({
//         status: "done",
//         progress: 100,
//         url: intent.data.fileUrl,
//       });
//     } catch {
//       setFlierUpload({ status: "error", progress: 0, url: null });
//       toast.error("Flyer upload failed. Please try again.");
//     }
//   };

//   const handleVideoChange = async (file: File) => {
//     if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
//       toast.warning("Please upload an MP4, MOV, or WebM file.");
//       return;
//     }
//     if (file.size > MAX_VIDEO_SIZE) {
//       toast.warning("Video must be 350 MB or less.");
//       return;
//     }
//     setVideoUpload({ status: "uploading", progress: 0, url: null });
//     try {
//       const intent = await uploadIntent({
//         filename: file.name,
//         contentType: file.type,
//         folder: "events",
//       }).unwrap();
//       await uploadFileToCDN(file, intent.data.uploadUrl, (pct) =>
//         setVideoUpload((p) => ({ ...p, progress: pct }))
//       );
//       setVideoUpload({
//         status: "done",
//         progress: 100,
//         url: intent.data.fileUrl,
//       });
//     } catch {
//       setVideoUpload({ status: "error", progress: 0, url: null });
//       toast.error("Video upload failed. Please try again.");
//     }
//   };

//   const anyUploading =
//     flierUpload.status === "uploading" || videoUpload.status === "uploading";

//   const handleSave = async () => {
//     if (anyUploading) {
//       toast.warning("Please wait for uploads to finish.");
//       return;
//     }
//     try {
//       const payload: Record<string, any> = {};
//       if (form.name) payload.name = form.name;
//       if (form.description) payload.description = form.description;
//       if (form.locationName) payload.locationName = form.locationName;
//       if (form.virtualLink) payload.virtualLink = form.virtualLink;
//       if (form.capacity) payload.capacity = Number(form.capacity);
//       if (form.startsAt)
//         payload.startsAt = new Date(form.startsAt).toISOString();
//       if (form.endsAt) payload.endsAt = new Date(form.endsAt).toISOString();
//       // Always include media URLs — null means "remove", a string means "set/replace"
//       payload.flierUrl = flierUpload.url ?? null;
//       payload.promoVideoUrl = videoUpload.url ?? null;

//       await updateEvent({ eventId: event.id, data: payload }).unwrap();
//       toast.success("Event updated.");
//       onOpenChange(false);
//     } catch (err: any) {
//       toast.error(err?.data?.message ?? "Failed to update event.");
//     }
//   };

//   const showLocation =
//     event?.mode === "ONSITE" || event?.mode === "HYBRID" || !event?.mode;
//   const showVirtualLink = event?.mode === "VIRTUAL" || event?.mode === "HYBRID";

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent
//         className="max-w-md w-[95%] max-h-[90vh] overflow-y-auto"
//         onOpenAutoFocus={(e) => e.preventDefault()}
//       >
//         <DialogHeader>
//           <DialogTitle className="flex items-center gap-2">
//             <Edit2 className="h-4 w-4" />
//             Edit Event
//           </DialogTitle>
//         </DialogHeader>

//         <div className="space-y-4">
//           {/* Full-lock banner */}
//           {locked && (
//             <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-700">
//               <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
//               <p>This event has already started. All editing is now locked.</p>
//             </div>
//           )}

//           {/* ── Event Name ──────────────────────────────────────── */}
//           <div className="space-y-2">
//             <Label htmlFor="ev-name">Event Name</Label>
//             <Input
//               id="ev-name"
//               value={form.name}
//               onChange={(e) => setForm({ ...form, name: e.target.value })}
//               disabled={locked}
//               placeholder="Event name"
//             />
//           </div>

//           {/* ── Description ─────────────────────────────────────── */}
//           <div className="space-y-2">
//             <Label htmlFor="ev-desc">Description</Label>
//             <Textarea
//               id="ev-desc"
//               value={form.description}
//               onChange={(e) =>
//                 setForm({ ...form, description: e.target.value })
//               }
//               disabled={locked}
//               placeholder="Describe your event"
//               rows={3}
//             />
//           </div>

//           {/* ── Start Date & Time ───────────────────────────────── */}
//           <div className="space-y-1.5">
//             <Label className="flex items-center gap-1.5">
//               Start Date &amp; Time
//               {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
//             </Label>
//             <Input
//               type="datetime-local"
//               value={form.startsAt}
//               onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
//               disabled={locked}
//             />
//           </div>

//           {/* ── Location / virtual link ──────────────────────────── */}
//           {showLocation && (
//             <div className="space-y-2">
//               <Label htmlFor="ev-location">Location</Label>
//               <Input
//                 id="ev-location"
//                 value={form.locationName}
//                 onChange={(e) =>
//                   setForm({ ...form, locationName: e.target.value })
//                 }
//                 disabled={locked}
//                 placeholder="Venue name or address"
//               />
//             </div>
//           )}

//           {showVirtualLink && (
//             <div className="space-y-2">
//               <Label htmlFor="ev-virtual">Meeting Link</Label>
//               <Input
//                 id="ev-virtual"
//                 value={form.virtualLink}
//                 onChange={(e) =>
//                   setForm({ ...form, virtualLink: e.target.value })
//                 }
//                 disabled={locked}
//                 placeholder="https://meet.example.com/..."
//               />
//             </div>
//           )}

//           {/* ── Event Flyer ─────────────────────────────────────── */}
//           <div className="space-y-2">
//             <Label className="flex items-center gap-1.5">
//               Event Flyer
//               {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
//             </Label>

//             {flierUpload.status === "uploading" ? (
//               <div className="flex flex-col items-center justify-center gap-2 w-full h-24 rounded-xl border border-border bg-muted/30">
//                 <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
//                 <p className="text-xs text-muted-foreground">
//                   {flierUpload.progress}%
//                 </p>
//               </div>
//             ) : flierUpload.url ? (
//               <div className="relative w-full h-36 rounded-xl overflow-hidden border border-border">
//                 <Image
//                   src={flierUpload.url}
//                   alt="Event flyer"
//                   fill
//                   className="object-cover"
//                 />
//                 {!locked && (
//                   <div className="absolute inset-x-0 bottom-0 flex gap-2 p-2 bg-gradient-to-t from-black/70 to-transparent">
//                     <button
//                       type="button"
//                       onClick={() => flierInputRef.current?.click()}
//                       className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs py-1.5 transition-colors"
//                     >
//                       <ImageIcon className="h-3 w-3" /> Change
//                     </button>
//                     <button
//                       type="button"
//                       onClick={() => {
//                         setFlierUpload(UPLOAD_IDLE);
//                         if (flierInputRef.current)
//                           flierInputRef.current.value = "";
//                       }}
//                       className="flex items-center justify-center gap-1 rounded-lg bg-red-500/70 hover:bg-red-500/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 transition-colors"
//                     >
//                       <X className="h-3 w-3" /> Remove
//                     </button>
//                   </div>
//                 )}
//               </div>
//             ) : (
//               !locked && (
//                 <button
//                   type="button"
//                   onClick={() => flierInputRef.current?.click()}
//                   className="flex w-full items-center justify-center gap-2 h-20 rounded-xl border-2 border-dashed border-border hover:border-[#531342] hover:bg-muted/30 active:bg-muted/50 transition-colors text-muted-foreground"
//                 >
//                   <ImageIcon className="h-4 w-4" />
//                   <span className="text-sm">Upload flyer</span>
//                 </button>
//               )
//             )}

//             {flierUpload.status === "error" && (
//               <Button
//                 type="button"
//                 variant="outline"
//                 size="sm"
//                 onClick={() => flierInputRef.current?.click()}
//                 className="w-full"
//               >
//                 Retry upload
//               </Button>
//             )}
//             <input
//               ref={flierInputRef}
//               type="file"
//               accept={ACCEPTED_IMAGE_TYPES.join(",")}
//               className="hidden"
//               onChange={(e) => {
//                 const file = e.target.files?.[0];
//                 if (file) handleFlierChange(file);
//                 e.target.value = "";
//               }}
//             />
//           </div>

//           {/* ── Promotional Video ────────────────────────────────── */}
//           <div className="space-y-2">
//             <Label className="flex items-center gap-1.5">
//               Promotional Video
//               {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
//             </Label>

//             {videoUpload.status === "uploading" ? (
//               <div className="flex flex-col items-center justify-center gap-2 w-full h-24 rounded-xl border border-border bg-muted/30">
//                 <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
//                 <p className="text-xs text-muted-foreground">
//                   {videoUpload.progress}%
//                 </p>
//               </div>
//             ) : videoUpload.url ? (
//               <div className="relative w-full rounded-xl overflow-hidden border border-border bg-black">
//                 <video
//                   src={videoUpload.url}
//                   controls
//                   className="w-full max-h-40 object-contain"
//                 />
//                 {!locked && (
//                   <div className="absolute inset-x-0 bottom-0 flex gap-2 p-2 bg-gradient-to-t from-black/70 to-transparent">
//                     <button
//                       type="button"
//                       onClick={() => videoInputRef.current?.click()}
//                       className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs py-1.5 transition-colors"
//                     >
//                       <Video className="h-3 w-3" /> Change
//                     </button>
//                     <button
//                       type="button"
//                       onClick={() => {
//                         setVideoUpload(UPLOAD_IDLE);
//                         if (videoInputRef.current)
//                           videoInputRef.current.value = "";
//                       }}
//                       className="flex items-center justify-center gap-1 rounded-lg bg-red-500/70 hover:bg-red-500/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 transition-colors"
//                     >
//                       <X className="h-3 w-3" /> Remove
//                     </button>
//                   </div>
//                 )}
//               </div>
//             ) : (
//               !locked && (
//                 <button
//                   type="button"
//                   onClick={() => videoInputRef.current?.click()}
//                   className="flex w-full items-center justify-center gap-2 h-20 rounded-xl border-2 border-dashed border-border hover:border-[#531342] hover:bg-muted/30 active:bg-muted/50 transition-colors text-muted-foreground"
//                 >
//                   <Video className="h-4 w-4" />
//                   <span className="text-sm">Upload video</span>
//                 </button>
//               )
//             )}

//             {videoUpload.status === "error" && (
//               <Button
//                 type="button"
//                 variant="outline"
//                 size="sm"
//                 onClick={() => videoInputRef.current?.click()}
//                 className="w-full"
//               >
//                 Retry upload
//               </Button>
//             )}
//             <input
//               ref={videoInputRef}
//               type="file"
//               accept={ACCEPTED_VIDEO_TYPES.join(",")}
//               className="hidden"
//               onChange={(e) => {
//                 const file = e.target.files?.[0];
//                 if (file) handleVideoChange(file);
//                 e.target.value = "";
//               }}
//             />
//           </div>

//           {/* ── Actions ─────────────────────────────────────────── */}
//           <div className="flex gap-2 pt-1">
//             <Button
//               variant="outline"
//               className="flex-1"
//               onClick={() => onOpenChange(false)}
//             >
//               Cancel
//             </Button>
//             <Button
//               className="flex-1 bg-[#531342] hover:bg-[#531342]/90 text-white"
//               disabled={locked || isSaving || anyUploading}
//               onClick={handleSave}
//             >
//               {isSaving ? (
//                 <Loader2 className="h-4 w-4 animate-spin" />
//               ) : anyUploading ? (
//                 <span className="flex items-center gap-2">
//                   <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
//                 </span>
//               ) : (
//                 "Save Changes"
//               )}
//             </Button>
//           </div>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }

// // ── Event Tags Editor ─────────────────────────────────────────────────────────

// function EventTagsEditor({ event }: { event: any }) {
//   const locked = isEventStarted(event?.startsAt);

//   // GET /v1/discover/tags — public, returns all available tags for the picker
//   const { data: discoverTagsData } = useGetDiscoverTagsQuery();
//   const [addTags, { isLoading: isAdding }] = useAddEventTagsMutation();
//   const [removeTags, { isLoading: isRemoving }] = useRemoveEventTagsMutation();
//   const [createTag, { isLoading: isCreating }] = useCreateDiscoverTagMutation();

//   // Text input for searching / creating a new tag
//   const [tagInput, setTagInput] = useState("");
//   // Track which specific tag is currently being removed
//   const [removingTagId, setRemovingTagId] = useState<string | null>(null);

//   const allTags: any[] = discoverTagsData ?? [];
//   // Tags currently attached to the event
//   const eventTagIds: string[] = (event?.tags ?? event?.vibeTags ?? []).map(
//     (t: any) => t.id ?? t
//   );

//   const handleRemove = async (tagId: string) => {
//     setRemovingTagId(tagId);
//     try {
//       await removeTags({ eventId: event.id, tagIds: [tagId] }).unwrap();
//       toast.success("Tag removed.");
//     } catch (err: any) {
//       toast.error(err?.data?.message ?? "Failed to remove tag.");
//     } finally {
//       setRemovingTagId(null);
//     }
//   };

//   const handleAdd = async (tagId: string) => {
//     try {
//       await addTags({ eventId: event.id, tagIds: [tagId] }).unwrap();
//       toast.success("Tag added.");
//     } catch (err: any) {
//       toast.error(err?.data?.message ?? "Failed to add tag.");
//     }
//   };

//   // Create a brand-new tag then immediately add it to the event
//   const handleCreateAndAdd = async () => {
//     const name = tagInput.trim();
//     if (!name) return;
//     try {
//       const newTag = await createTag({ name }).unwrap();
//       if (!newTag?.id) {
//         toast.error("Could not get tag ID from server. Please try again.");
//         return;
//       }
//       await addTags({ eventId: event.id, tagIds: [newTag.id] }).unwrap();
//       toast.success(`Tag "${newTag.name}" created and added.`);
//       setTagInput("");
//     } catch (err: any) {
//       toast.error(err?.data?.message ?? "Failed to create tag.");
//     }
//   };

//   const attachedTags = allTags.filter((t) => eventTagIds.includes(t.id));
//   const availableTags = allTags.filter((t) => !eventTagIds.includes(t.id));

//   // Tags visible in the picker — filtered by what the user has typed
//   const filteredAvailable = tagInput
//     ? availableTags.filter((t) =>
//         t.name.toLowerCase().includes(tagInput.toLowerCase())
//       )
//     : availableTags;

//   // Only show "create" option when the typed name doesn't match any existing tag exactly
//   const showCreateOption =
//     tagInput.trim() &&
//     !allTags.some(
//       (t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()
//     );

//   return (
//     <div className="space-y-3">
//       {locked && (
//         <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-700">
//           <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
//           <p>Tag editing is locked once the event has started.</p>
//         </div>
//       )}

//       {/* Attached tags — chips with ✕ */}
//       {attachedTags.length > 0 && (
//         <div>
//           <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
//             Active Tags
//           </p>
//           <div className="flex flex-wrap gap-2">
//             {attachedTags.map((tag) => (
//               <div
//                 key={tag.id}
//                 className="flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs"
//               >
//                 <span>{tag.name}</span>
//                 {!locked && (
//                   <button
//                     onClick={() => handleRemove(tag.id)}
//                     disabled={removingTagId === tag.id}
//                     className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
//                     aria-label={`Remove tag ${tag.name}`}
//                   >
//                     {removingTagId === tag.id ? (
//                       <Loader2 className="h-3 w-3 animate-spin" />
//                     ) : (
//                       <X className="h-3 w-3" />
//                     )}
//                   </button>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* Search / add picker */}
//       {!locked && (
//         <div>
//           <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
//             Add Tags
//           </p>
//           <Input
//             placeholder="Search or create a tag..."
//             value={tagInput}
//             onChange={(e) => setTagInput(e.target.value)}
//             className="mb-2 h-8 text-sm"
//           />

//           {/* Filtered available tags */}
//           {filteredAvailable.length > 0 && (
//             <div className="flex flex-wrap gap-2 mb-2">
//               {filteredAvailable.map((tag) => (
//                 <button
//                   key={tag.id}
//                   onClick={() => {
//                     handleAdd(tag.id);
//                     setTagInput("");
//                   }}
//                   disabled={isAdding}
//                   className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-[#531342] hover:text-[#531342] transition-colors"
//                 >
//                   <Plus className="h-3 w-3" />
//                   {tag.name}
//                 </button>
//               ))}
//             </div>
//           )}

//           {/* "Create new tag" option — only when no exact match */}
//           {showCreateOption && (
//             <button
//               onClick={handleCreateAndAdd}
//               disabled={isCreating || isAdding}
//               className="flex items-center gap-1.5 rounded-full border border-dashed border-[#531342] px-3 py-1 text-xs text-[#531342] hover:bg-[#531342]/5 transition-colors disabled:opacity-50"
//             >
//               {isCreating ? (
//                 <Loader2 className="h-3 w-3 animate-spin" />
//               ) : (
//                 <Plus className="h-3 w-3" />
//               )}
//               Create &ldquo;{tagInput.trim()}&rdquo;
//             </button>
//           )}
//         </div>
//       )}

//       {attachedTags.length === 0 && availableTags.length === 0 && !tagInput && (
//         <p className="text-xs text-muted-foreground text-center py-2">
//           No tags found. Type a name above to create one.
//         </p>
//       )}
//     </div>
//   );
// }

// function EventHeaderSkeleton() {
//   return (
//     <Card className="mb-6 overflow-hidden border-primary/20">
//       <div className="flex gap-4 p-4">
//         <Skeleton className="h-24 w-24 shrink-0 rounded-xl" />
//         <div className="flex-1 space-y-2 min-w-0">
//           <Skeleton className="h-5 w-2/3" />
//           <Skeleton className="h-4 w-1/2" />
//           <Skeleton className="h-4 w-1/3" />
//           <div className="flex gap-2 mt-3">
//             <Skeleton className="h-8 w-16 rounded-full" />
//             <Skeleton className="h-8 w-16 rounded-full" />
//             <Skeleton className="h-8 w-14 rounded-full" />
//           </div>
//         </div>
//       </div>
//     </Card>
//   );
// }

// function DashboardCardSkeleton() {
//   return (
//     <div className="rounded-xl border border-border overflow-hidden">
//       <div className="flex items-center justify-between px-4 py-3 border-b border-border">
//         <div className="flex items-center gap-2">
//           <Skeleton className="h-4 w-4 rounded" />
//           <Skeleton className="h-4 w-28" />
//         </div>
//         <Skeleton className="h-5 w-14 rounded-full" />
//       </div>
//       <div className="space-y-3 p-4">
//         <Skeleton className="h-14 w-full rounded-lg" />
//         <Skeleton className="h-14 w-full rounded-lg" />
//         <Skeleton className="h-10 w-2/3 rounded-lg" />
//       </div>
//     </div>
//   );
// }

// interface OrganizerDashboardProps {
//   eventId: string;
// }

// export default function OrganizerDashboard({
//   eventId,
// }: OrganizerDashboardProps) {
//   const {
//     data: eventDetails,
//     isLoading,
//     refetch: refetchEvent,
//   } = useGetEventDetailsQuery(eventId);
//   const { data: gamesData } = useGetGamesQuery(eventId);
//   const { data: remindersData = [] } = useGetRemindersQuery(eventId);
//   const templates = remindersData;
//   const [updateEventStatus, { isLoading: isUpdatingStatus }] =
//     useUpdateEventStatusMutation();
//   const [showQR, setShowQR] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [confirmStatus, setConfirmStatus] = useState<
//     "PUBLISHED" | "CANCELLED" | "ENDED" | null
//   >(null);

//   const event = eventDetails?.data;

//   const totalTicketsSold =
//     event?.ticketTiers?.reduce(
//       (total: number, tier: any) => total + (tier.quantitySold ?? 0),
//       0
//     ) ?? 0;

//   const rsvpCount = event?.attendingCount ?? event?.rsvpCount ?? 0;

//   const liveGameCount = (gamesData?.data ?? []).filter(
//     (g: any) => g.status === "ACTIVE"
//   ).length;

//   const vibeTagCount = (event?.vibeTag ?? []).length;

//   const eventUrl =
//     typeof window !== "undefined"
//       ? `${window.location.origin}/events/${eventId}`
//       : "";

//   const [isSharing, setIsSharing] = useState(false);

//   const handleShare = async () => {
//     const shareText = `Check out this event: ${event?.name ?? "Event"}`;

//     // Try to share with the flier image attached
//     if (navigator.share && event?.flierUrl) {
//       setIsSharing(true);
//       try {
//         const proxyUrl = `/api/media-proxy?url=${encodeURIComponent(
//           event.flierUrl
//         )}`;
//         const res = await fetch(proxyUrl);
//         if (res.ok) {
//           const blob = await res.blob();
//           const ext = blob.type.includes("png")
//             ? "png"
//             : blob.type.includes("webp")
//             ? "webp"
//             : "jpg";
//           const file = new File(
//             [blob],
//             `${event?.name ?? "event"}-flier.${ext}`,
//             {
//               type: blob.type || "image/jpeg",
//             }
//           );
//           if (navigator.canShare?.({ files: [file] })) {
//             try {
//               await navigator.share({
//                 files: [file],
//                 title: event?.name ?? "Event",
//                 text: shareText,
//                 url: eventUrl,
//               });
//               setIsSharing(false);
//               return;
//             } catch (e: any) {
//               if (e?.name === "AbortError") {
//                 setIsSharing(false);
//                 return;
//               }
//               // fall through to URL-only share
//             }
//           }
//         }
//       } catch {
//         // fall through to URL-only share
//       }
//       setIsSharing(false);
//     }

//     // Fallback: share URL only
//     try {
//       if (navigator.share) {
//         await navigator.share({
//           title: event?.name ?? "Event",
//           text: shareText,
//           url: eventUrl,
//         });
//       } else {
//         await navigator.clipboard.writeText(eventUrl);
//         toast.success("Link copied to clipboard");
//       }
//     } catch (err: any) {
//       if (err?.name !== "AbortError") {
//         await navigator.clipboard.writeText(eventUrl).catch(() => {});
//         toast.success("Link copied to clipboard");
//       }
//     }
//   };

//   const handleStatusUpdate = async (
//     status: "PUBLISHED" | "CANCELLED" | "ENDED"
//   ) => {
//     try {
//       await updateEventStatus({ eventId, status }).unwrap();
//       toast.success(
//         status === "PUBLISHED"
//           ? "Event published! It's now live."
//           : status === "ENDED"
//           ? "Event marked as ended."
//           : "Event cancelled."
//       );
//       setConfirmStatus(null);
//     } catch (err: any) {
//       toast.error(err?.data?.message ?? "Failed to update event status.");
//     }
//   };

//   useEffect(() => {
//     if (event) {
//       if (typeof window !== "undefined") {
//         localStorage.setItem("eventName", JSON.stringify(event.name));
//         localStorage.setItem("eventId", eventId);
//       }
//     }
//   });

//   return (
//     <div className="min-h-screen bg-background pb-24">
//       <main className="container px-4 py-6">
//         <div className="mb-4 flex items-center gap-3">
//           <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
//             <BarChart3 className="h-4 w-4 text-primary" />
//           </div>
//           <div>
//             <h2 className="font-display text-lg font-bold text-foreground">
//               Dashboard
//             </h2>
//             <p className="text-xs text-muted-foreground">
//               Manage your events, tickets & engagement
//             </p>
//           </div>
//         </div>

//         {isLoading ? (
//           <EventHeaderSkeleton />
//         ) : (
//           <Card className="mb-6 overflow-hidden border-primary/20 bg-linear-to-br from-primary/5 to-accent/5">
//             <div className="flex gap-4 p-4">
//               <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
//                 {event?.flierUrl ? (
//                   <Image
//                     width={96}
//                     height={96}
//                     src={event.flierUrl}
//                     alt={event?.name ?? "Event"}
//                     className="h-full w-full object-cover"
//                   />
//                 ) : (
//                   <div className="h-full w-full bg-primary/10 flex items-center justify-center">
//                     <ImageIcon className="h-8 w-8 text-primary/40" />
//                   </div>
//                 )}
//                 {event?.status === "LIVE" && (
//                   <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5">
//                     <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
//                     <span className="text-[10px] font-semibold text-white">
//                       LIVE
//                     </span>
//                   </div>
//                 )}
//                 {event?.status === "DRAFT" && (
//                   <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-gray-500 px-2 py-0.5">
//                     <span className="h-1.5 w-1.5 rounded-full bg-white" />
//                     <span className="text-[10px] font-semibold text-white">
//                       DRAFT
//                     </span>
//                   </div>
//                 )}
//               </div>

//               <div className="flex-1 min-w-0">
//                 <h1 className="font-display text-xl font-bold text-foreground truncate">
//                   {event?.name}
//                 </h1>
//                 <p className="mt-1 text-sm text-muted-foreground">
//                   {formatDate(event?.startsAt)} • {formatTime(event?.startsAt)}
//                 </p>
//                 <p className="text-sm text-muted-foreground truncate">
//                   {event?.locationName}
//                 </p>
//                 <div className="mt-3 flex gap-2">
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     className="h-8 gap-1.5 rounded-full border border-[#531342] text-[#531342] hover:bg-[#531342]/10"
//                     onClick={() => setShowQR(true)}
//                   >
//                     <QrCode className="h-3.5 w-3.5" />
//                     QR
//                   </Button>
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     className="h-8 gap-1.5 rounded-full border border-[#531342] text-[#531342] hover:bg-[#531342]/10"
//                     onClick={handleShare}
//                     disabled={isSharing}
//                   >
//                     {isSharing ? (
//                       <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#531342] border-t-transparent" />
//                     ) : (
//                       <Share2 className="h-3.5 w-3.5" />
//                     )}
//                     Share
//                   </Button>
//                   <Link
//                     href={`/events/${eventId}`}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="h-8 gap-1.5 rounded-full flex items-center text-sm"
//                   >
//                     <ExternalLink className="h-3.5 w-3.5" />
//                     View
//                   </Link>
//                 </div>
//               </div>
//             </div>
//           </Card>
//         )}

//         {showQR && (
//           <div
//             className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
//             onClick={() => setShowQR(false)}
//           >
//             <div
//               className="relative bg-background rounded-2xl p-6 flex flex-col items-center gap-4 shadow-xl mx-4"
//               onClick={(e) => e.stopPropagation()}
//             >
//               <button
//                 onClick={() => setShowQR(false)}
//                 className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
//               >
//                 <X className="h-5 w-5" />
//               </button>
//               <h3 className="font-semibold text-foreground">{event?.name}</h3>
//               <div className="rounded-xl bg-white p-4 shadow">
//                 <QRCodeSVG value={event?.qrCode || eventUrl} size={200} />
//               </div>
//               <p className="text-xs text-muted-foreground text-center max-w-55 break-all">
//                 {eventUrl}
//               </p>
//               <Button
//                 className="w-full rounded-xl"
//                 onClick={() => {
//                   navigator.clipboard.writeText(eventUrl);
//                   toast.success("Link copied!");
//                 }}
//               >
//                 Copy Link
//               </Button>
//             </div>
//           </div>
//         )}

//         {/* Confirm Status Modal */}
//         {confirmStatus && (
//           <div
//             className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
//             onClick={() => setConfirmStatus(null)}
//           >
//             <div
//               className="relative bg-background rounded-2xl p-6 flex flex-col gap-4 shadow-xl mx-4 w-full max-w-sm"
//               onClick={(e) => e.stopPropagation()}
//             >
//               <div className="flex items-center gap-3">
//                 {confirmStatus === "ENDED" ? (
//                   <StopCircle className="h-6 w-6 text-red-500 shrink-0" />
//                 ) : confirmStatus === "CANCELLED" ? (
//                   <XCircle className="h-6 w-6 text-gray-500 shrink-0" />
//                 ) : (
//                   <CheckCircle2 className="h-6 w-6 text-[#531342] shrink-0" />
//                 )}
//                 <h3 className="font-semibold text-foreground">
//                   {confirmStatus === "ENDED"
//                     ? "End Event?"
//                     : confirmStatus === "CANCELLED"
//                     ? "Cancel Event?"
//                     : "Publish Event?"}
//                 </h3>
//               </div>
//               <p className="text-sm text-muted-foreground">
//                 {confirmStatus === "ENDED"
//                   ? "This will mark the event as ended. This action cannot be undone."
//                   : confirmStatus === "CANCELLED"
//                   ? "This will cancel the event. Attendees will be notified. This action cannot be undone."
//                   : "This will publish your event and make it visible to attendees."}
//               </p>
//               <div className="flex gap-3">
//                 <Button
//                   variant="outline"
//                   className="flex-1 rounded-xl"
//                   onClick={() => setConfirmStatus(null)}
//                   disabled={isUpdatingStatus}
//                 >
//                   Go Back
//                 </Button>
//                 <Button
//                   className={`flex-1 rounded-xl text-white ${
//                     confirmStatus === "ENDED"
//                       ? "bg-red-500 hover:bg-red-600"
//                       : confirmStatus === "CANCELLED"
//                       ? "bg-gray-500 hover:bg-gray-600"
//                       : "bg-[#531342] hover:bg-[#531342]/90"
//                   }`}
//                   onClick={() =>
//                     confirmStatus && handleStatusUpdate(confirmStatus)
//                   }
//                   disabled={isUpdatingStatus}
//                 >
//                   {isUpdatingStatus ? (
//                     <span className="flex items-center gap-2">
//                       <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
//                       Updating...
//                     </span>
//                   ) : confirmStatus === "ENDED" ? (
//                     "End Event"
//                   ) : confirmStatus === "CANCELLED" ? (
//                     "Cancel Event"
//                   ) : (
//                     "Publish"
//                   )}
//                 </Button>
//               </div>
//             </div>
//           </div>
//         )}

//         <div className="space-y-4">
//           {/* Private event access key panel */}
//           {!isLoading && event?.isPublic === false && event?.accessKey && (
//             <AccessKeyDisplay accessKey={event.accessKey} eventId={eventId} />
//           )}

//           {isLoading ? (
//             <DashboardCardSkeleton />
//           ) : (
//             <EventDashboardCard
//               title="RSVP Tracker"
//               icon={<Users className="h-4 w-4" />}
//               badge={
//                 <Badge
//                   variant="secondary"
//                   className="text-xs bg-[#531342]/10 text-[#531342] font-semibold"
//                 >
//                   {rsvpCount} Going
//                 </Badge>
//               }
//               defaultOpen={true}
//             >
//               <RSVPTrackerContent eventId={eventId} />
//             </EventDashboardCard>
//           )}

//           {isLoading ? (
//             <DashboardCardSkeleton />
//           ) : (
//             <EventDashboardCard
//               title="Edit Event"
//               icon={<Edit2 className="h-4 w-4" />}
//               badge={
//                 isEventStarted(event?.startsAt) ? (
//                   <Badge
//                     variant="outline"
//                     className="border-red-400 text-red-500 text-xs gap-1"
//                   >
//                     <Lock className="h-3 w-3" />
//                     Locked
//                   </Badge>
//                 ) : (
//                   <Badge
//                     variant="outline"
//                     className="border-green-500 text-green-600 text-xs"
//                   >
//                     Editable
//                   </Badge>
//                 )
//               }
//             >
//               <div className="space-y-3">
//                 {isEventStarted(event?.startsAt) ? (
//                   <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
//                     <p className="text-sm text-muted-foreground">
//                       This event has already started. All editing is now locked.
//                     </p>
//                   </div>
//                 ) : (
//                   <p className="text-sm text-muted-foreground">
//                     Update name, description, date &amp; time, flyer, promo
//                     video, location, or capacity. All editing locks the moment
//                     the event starts.
//                   </p>
//                 )}
//                 <Button
//                   size="sm"
//                   className="w-full gap-1.5 rounded-xl bg-[#531342] hover:bg-[#531342]/90 text-white disabled:opacity-50"
//                   disabled={isEventStarted(event?.startsAt)}
//                   onClick={() => setShowEditModal(true)}
//                 >
//                   <Edit2 className="h-3.5 w-3.5" />
//                   {isEventStarted(event?.startsAt)
//                     ? "Editing Locked"
//                     : "Edit Event"}
//                 </Button>
//               </div>
//             </EventDashboardCard>
//           )}

//           {isLoading ? (
//             <DashboardCardSkeleton />
//           ) : (
//             <EventDashboardCard
//               title="Event Reminders"
//               icon={<Bell className="h-4 w-4" />}
//               badge={
//                 <Badge
//                   variant="secondary"
//                   className="text-xs bg-[#531342]/10 text-[#531342] font-semibold"
//                 >
//                   {templates.filter((t: any) => t.enabled).length} Active
//                 </Badge>
//               }
//             >
//               <EventRemindersContent
//                 eventId={eventId}
//                 eventStartsAt={event?.startsAt}
//                 eventStatus={event?.status}
//               />
//             </EventDashboardCard>
//           )}

//           {isLoading ? (
//             <DashboardCardSkeleton />
//           ) : (
//             <EventDashboardCard
//               title="Event Tags"
//               icon={<Tag className="h-4 w-4" />}
//               badge={
//                 isEventStarted(event?.startsAt) ? (
//                   <Badge
//                     variant="outline"
//                     className="border-red-400 text-red-500 text-xs gap-1"
//                   >
//                     <Lock className="h-3 w-3" />
//                     Locked
//                   </Badge>
//                 ) : (
//                   <Badge
//                     variant="secondary"
//                     className="text-xs bg-[#531342]/10 text-[#531342] font-semibold"
//                   >
//                     {(event?.tags ?? event?.vibeTags ?? []).length} Tags
//                   </Badge>
//                 )
//               }
//             >
//               <EventTagsEditor event={event} />
//             </EventDashboardCard>
//           )}

//           {/* Edit Event Modal */}
//           {event && (
//             <EventEditModal
//               event={event}
//               open={showEditModal}
//               onOpenChange={setShowEditModal}
//             />
//           )}

//           {isLoading ? (
//             <DashboardCardSkeleton />
//           ) : (
//             <EventDashboardCard
//               title="Ticket Management"
//               icon={<Ticket className="h-4 w-4" />}
//               badge={
//                 <Badge className="bg-green-500/10 text-green-600 text-xs">
//                   {totalTicketsSold} Sold
//                 </Badge>
//               }
//             >
//               <TicketCreatorEnhanced
//                 eventId={eventId}
//                 eventDetails={event?.ticketTiers}
//                 eventStatus={event?.status}
//               />
//             </EventDashboardCard>
//           )}

//           {/* Recent Purchases */}
//           {/* {isLoading ? (
//             <DashboardCardSkeleton />
//           ) : (
//             <EventDashboardCard
//               title="Recent Purchases"
//               icon={<ShoppingCart className="h-4 w-4" />}
//               badge={
//                 <Badge className="bg-green-500/10 text-green-600 text-xs">
//                   {event?.totalRevenue ? `₦${(event.totalRevenue / 100).toLocaleString()}` : "₦0"}
//                 </Badge>
//               }
//             >
//               <RecentPurchasesContent />
//             </EventDashboardCard>
//           )} */}

//           {isLoading ? (
//             <DashboardCardSkeleton />
//           ) : (
//             <EventDashboardCard
//               title="Gamification Hub"
//               icon={<Gamepad2 className="h-4 w-4" />}
//               badge={
//                 <Badge className="bg-green-500/10 text-green-600 text-xs">
//                   {liveGameCount} Live
//                 </Badge>
//               }
//             >
//               <GamificationHubContent
//                 eventId={eventId}
//                 roundId={event?.rounds?.id}
//                 eventName={event?.name}
//                 eventStartsAt={event?.startsAt}
//                 eventStatus={event?.status}
//                 eventPlan={event?.eventPlan ?? null}
//                 hasPayment={totalTicketsSold > 0}
//               />
//             </EventDashboardCard>
//           )}

//           {isLoading ? (
//             <DashboardCardSkeleton />
//           ) : (
//             <EventDashboardCard
//               title="VibeTag Studio"
//               icon={<Tag className="h-4 w-4" />}
//               badge={
//                 <Badge
//                   variant="secondary"
//                   className="text-xs bg-[#531342]/10 text-[#531342] font-semibold"
//                 >
//                   {vibeTagCount} {vibeTagCount === 1 ? "Tag" : "Tags"}
//                 </Badge>
//               }
//             >
//               <VibeTagStudioContent
//                 eventId={eventId}
//                 name={event?.name}
//                 vibeTag={event?.vibeTag ?? null}
//                 eventPlan={event?.eventPlan ?? null}
//               />
//             </EventDashboardCard>
//           )}

//           {/* Update Event Status */}
//           {!isLoading && (
//             <EventDashboardCard
//               title="Update Event Status"
//               icon={<ChevronDown className="h-4 w-4" />}
//               badge={
//                 <Badge
//                   variant="outline"
//                   className={
//                     event?.status === "PUBLISHED"
//                       ? "border-green-500 text-green-600"
//                       : event?.status === "LIVE"
//                       ? "border-green-500 text-green-600 animate-pulse"
//                       : event?.status === "ENDED"
//                       ? "border-gray-400 text-gray-500"
//                       : event?.status === "CANCELLED"
//                       ? "border-red-400 text-red-500"
//                       : "border-amber-500 text-amber-600"
//                   }
//                 >
//                   {event?.status ?? "DRAFT"}
//                 </Badge>
//               }
//             >
//               <div className="space-y-3">
//                 {event?.status === "DRAFT" && (
//                   <div className="rounded-xl border border-border p-4">
//                     <p className="text-sm text-muted-foreground">
//                       Your event is a draft. Use the &quot;Publish Your
//                       Event&quot; section below to choose a plan and publish.
//                     </p>
//                   </div>
//                 )}

//                 {(event?.status === "PUBLISHED" ||
//                   event?.status === "LIVE") && (
//                   <div className="space-y-2">
//                     <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
//                       <p className="text-sm text-muted-foreground">
//                         Mark the event as ended once it&apos;s over. Rewards
//                         will be distributed automatically.
//                       </p>
//                       <Button
//                         variant="outline"
//                         className="w-full gap-2 rounded-xl border-red-500/50 text-red-500 hover:bg-red-500/10"
//                         onClick={() => setConfirmStatus("ENDED")}
//                         disabled={isUpdatingStatus}
//                       >
//                         <StopCircle className="h-4 w-4" />
//                         End Event
//                       </Button>
//                     </div>
//                     <div className="rounded-xl border border-gray-300 bg-muted/30 p-4 space-y-3">
//                       <p className="text-sm text-muted-foreground">
//                         Cancel the event. Attendees will be notified.
//                       </p>
//                       <Button
//                         variant="outline"
//                         className="w-full gap-2 rounded-xl border-gray-400 text-gray-500 hover:bg-gray-100"
//                         onClick={() => setConfirmStatus("CANCELLED")}
//                         disabled={isUpdatingStatus}
//                       >
//                         <XCircle className="h-4 w-4" />
//                         Cancel Event
//                       </Button>
//                     </div>
//                   </div>
//                 )}

//                 {(event?.status === "ENDED" ||
//                   event?.status === "CANCELLED") && (
//                   <div className="rounded-xl border border-border p-4 text-center">
//                     <p className="text-sm text-muted-foreground">
//                       This event has been{" "}
//                       {event?.status === "ENDED" ? "ended" : "cancelled"} and
//                       cannot be modified.
//                     </p>
//                   </div>
//                 )}
//               </div>
//             </EventDashboardCard>
//           )}

//           {/* {isLoading ? (
//             <DashboardCardSkeleton />
//           ) : (
//             <EventDashboardCard
//               title="Postcard Leaderboard"
//               icon={<ImageIcon className="h-4 w-4" />}
//               badge={
//                 <Badge
//                   variant="secondary"
//                   className="text-xs bg-[#531342]/10 text-[#531342] font-semibold"
//                 >
//                   {event?.postcardCount ?? 0} Posts
//                 </Badge>
//               }
//             >
//               <PostcardLeaderboardContent />
//             </EventDashboardCard>
//           )} */}

//           {/* {isLoading ? (
//             <DashboardCardSkeleton />
//           ) : (
//             <EventDashboardCard
//               title="Analytics"
//               icon={<BarChart3 className="h-4 w-4" />}
//               badge={
//                 <Badge className="bg-green-500/10 text-green-600 text-xs">
//                   +12%
//                 </Badge>
//               }
//             >
//               <AnalyticsPanelContent />
//             </EventDashboardCard>
//           )} */}

//           {/* Analytics — quick snapshot + link to full page */}
//           {!isLoading && (
//             <EventDashboardCard
//               title="Analytics"
//               icon={<BarChart3 className="h-4 w-4" />}
//               badge={
//                 <Badge
//                   variant="secondary"
//                   className="text-xs bg-[#531342]/10 text-[#531342] font-semibold"
//                 >
//                   Insights
//                 </Badge>
//               }
//             >
//               <div className="space-y-3">
//                 {/* Quick KPI strip from event details */}
//                 <div className="grid grid-cols-3 gap-2">
//                   {[
//                     {
//                       label: "RSVPs",
//                       value: rsvpCount,
//                       color: "text-[#531342]",
//                     },
//                     {
//                       label: "Tickets",
//                       value: totalTicketsSold,
//                       color: "text-green-600",
//                     },
//                     {
//                       label: "Games",
//                       value: liveGameCount,
//                       color: "text-purple-600",
//                     },
//                   ].map(({ label, value, color }) => (
//                     <div
//                       key={label}
//                       className="rounded-xl bg-muted/50 p-2.5 text-center"
//                     >
//                       <p className={`font-display text-lg font-bold ${color}`}>
//                         {value}
//                       </p>
//                       <p className="text-[10px] text-muted-foreground">
//                         {label}
//                       </p>
//                     </div>
//                   ))}
//                 </div>
//                 <p className="text-xs text-muted-foreground">
//                   Revenue, vibe-tags, postcards, social velocity &amp; audience
//                   demographics on the full page.
//                 </p>
//                 <Link
//                   href={`/dashboard/${eventId}/analytics`}
//                   className="block"
//                 >
//                   <Button className="w-full rounded-xl bg-[#531342] hover:bg-[#531342]/90 text-white gap-2">
//                     <BarChart3 className="h-4 w-4" />
//                     View Full Analytics
//                   </Button>
//                 </Link>
//               </div>
//             </EventDashboardCard>
//           )}

//           {isLoading ? (
//             <DashboardCardSkeleton />
//           ) : (
//             <PaymentModule
//               eventId={eventId}
//               eventStatus={event?.status}
//               onPublished={refetchEvent}
//             />
//           )}

//           {/* {isLoading ? (
//             <DashboardCardSkeleton />
//           ) : (
//             <EventDashboardCard
//               title="Event Settings"
//               icon={<Settings className="h-4 w-4" />}
//             >
//               <div className="space-y-3">
//                 <div className="flex items-center justify-between rounded-lg border border-border p-3">
//                   <span className="text-sm font-medium">
//                     Send reminder on event day
//                   </span>
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     className="h-7 rounded-full"
//                   >
//                     Enable
//                   </Button>
//                 </div>
//                 <div className="flex items-center justify-between rounded-lg border border-border p-3">
//                   <span className="text-sm font-medium">
//                     Make event private
//                   </span>
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     className="h-7 rounded-full"
//                   >
//                     Configure
//                   </Button>
//                 </div>
//                 <div className="flex gap-2">
//                   <Button variant="outline" className="flex-1 rounded-xl">
//                     Edit Event
//                   </Button>
//                   <Button variant="outline" className="flex-1 rounded-xl">
//                     Add Co-Hosts
//                   </Button>
//                 </div>
//               </div>
//             </EventDashboardCard>
//           )} */}
//         </div>
//       </main>
//     </div>
//   );
// }

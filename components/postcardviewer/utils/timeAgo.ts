export function getTimeAgo(date: Date): string {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const hr = Math.floor(m / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.floor(hr / 24);
    if (d < 7) return `${d}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
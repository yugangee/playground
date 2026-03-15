"use client";

export default function TodayBanner() {
    const now = new Date();
    const dateStr = now.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "short",
    });

    return (
        <div
            className="px-8 py-2 flex items-center gap-2 border-b text-xs"
            style={{
                borderColor: "var(--card-border)",
                background: "var(--card-bg)",
                color: "var(--text-muted)",
            }}
        >
            <span style={{ color: 'var(--text-muted)' }}>Today</span>
            <span>{dateStr}</span>
            <span className="mx-1" style={{ color: "var(--card-border)" }}>·</span>
            <span className="text-[var(--brand-primary)] font-semibold">오늘 주변 경기 12개</span>
        </div>
    );
}

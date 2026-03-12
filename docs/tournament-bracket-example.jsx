import { useState, useMemo, useCallback, useRef, useEffect } from "react";

// ─────────────────────────────────────────────
// DEMO DATA — 8-team single elimination bracket
// ─────────────────────────────────────────────
const DEMO_TEAMS = {
  t1: { name: "서울경제 어벤져스", color: "#3B82F6", short: "서울경제" },
  t2: { name: "한경 레전드", color: "#EF4444", short: "한경" },
  t3: { name: "조선 유나이티드", color: "#10B981", short: "조선" },
  t4: { name: "중앙 FC", color: "#F59E0B", short: "중앙FC" },
  t5: { name: "동아 스톰", color: "#8B5CF6", short: "동아" },
  t6: { name: "매경 이글스", color: "#EC4899", short: "매경" },
  t7: { name: "헤럴드 유나이티드", color: "#14B8A6", short: "헤럴드" },
  t8: { name: "국민일보 FC", color: "#F97316", short: "국민" },
};

const DEMO_MATCHES = [
  // 8강 (Round 0)
  { id: "m1", round: 0, position: 0, homeId: "t1", awayId: "t8", homeScore: 3, awayScore: 1, status: "confirmed" },
  { id: "m2", round: 0, position: 1, homeId: "t4", awayId: "t5", homeScore: 2, awayScore: 2, penaltyHome: 4, penaltyAway: 2, status: "confirmed" },
  { id: "m3", round: 0, position: 2, homeId: "t2", awayId: "t7", homeScore: 1, awayScore: 0, status: "confirmed" },
  { id: "m4", round: 0, position: 3, homeId: "t3", awayId: "t6", homeScore: 4, awayScore: 2, status: "confirmed" },
  // 준결승 (Round 1)
  { id: "m5", round: 1, position: 0, homeId: "t1", awayId: "t4", homeScore: 2, awayScore: 1, status: "confirmed" },
  { id: "m6", round: 1, position: 1, homeId: "t2", awayId: "t3", homeScore: null, awayScore: null, status: "live", minute: 28 },
  // 결승 (Round 2)
  { id: "m7", round: 2, position: 0, homeId: "t1", awayId: null, homeScore: null, awayScore: null, status: "scheduled" },
];

function getRoundLabel(roundIndex, totalRounds) {
  const labels = {
    1: ["결승"],
    2: ["준결승", "결승"],
    3: ["8강", "준결승", "결승"],
    4: ["16강", "8강", "준결승", "결승"],
    5: ["32강", "16강", "8강", "준결승", "결승"],
  };
  return labels[totalRounds]?.[roundIndex] ?? `${roundIndex + 1}라운드`;
}

function getMatchDate(match) {
  const dates = {
    m1: "3/11 09:00", m2: "3/11 11:00", m3: "3/11 14:00", m4: "3/11 16:00",
    m5: "3/12 10:00", m6: "3/12 14:00", m7: "3/13 15:00",
  };
  return dates[match.id] || "";
}

// ─────────────────────────────────
// STYLES — embedded for single-file
// ─────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;900&family=JetBrains+Mono:wght@700&display=swap');

  .bracket-root {
    --bg-primary: #0A0E17;
    --bg-card: #141B2D;
    --bg-card-hover: #1A2340;
    --bg-card-live: #1A1520;
    --border-default: #1E293B;
    --border-live: #EF4444;
    --text-primary: #F1F5F9;
    --text-secondary: #64748B;
    --text-muted: #475569;
    --accent-gold: #F59E0B;
    --accent-live: #EF4444;
    --accent-win: #10B981;
    --accent-blue: #3B82F6;
    --connector-color: #334155;
    --connector-decided: #64748B;
    font-family: 'Noto Sans KR', sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* Subtle grid texture */
  .bracket-root::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  .bracket-header {
    position: relative;
    z-index: 1;
    padding: 32px 40px 0;
  }

  .bracket-header__top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
  }

  .bracket-header__trophy {
    font-size: 28px;
    filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.4));
  }

  .bracket-header__title {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-primary);
  }

  .bracket-header__badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .badge--tournament {
    background: rgba(245, 158, 11, 0.12);
    color: var(--accent-gold);
    border: 1px solid rgba(245, 158, 11, 0.2);
  }

  .badge--live {
    background: rgba(239, 68, 68, 0.12);
    color: var(--accent-live);
    border: 1px solid rgba(239, 68, 68, 0.25);
    animation: pulse-glow 2s ease-in-out infinite;
  }

  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    50% { box-shadow: 0 0 8px 2px rgba(239, 68, 68, 0.15); }
  }

  .bracket-header__sub {
    font-size: 13px;
    color: var(--text-secondary);
    margin-left: 40px;
    margin-top: 2px;
  }

  /* Round labels bar */
  .round-labels {
    position: relative;
    z-index: 1;
    display: flex;
    padding: 24px 40px 0;
    gap: 0;
  }

  .round-label {
    flex: 1;
    text-align: center;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-default);
    transition: color 0.2s;
  }

  .round-label--active {
    color: var(--accent-gold);
    border-bottom-color: var(--accent-gold);
  }

  .round-label--live {
    color: var(--accent-live);
    border-bottom-color: var(--accent-live);
  }

  /* Main bracket area */
  .bracket-scroll {
    position: relative;
    z-index: 1;
    overflow-x: auto;
    overflow-y: visible;
    padding: 28px 40px 48px;
    -webkit-overflow-scrolling: touch;
  }

  .bracket-grid {
    display: flex;
    align-items: stretch;
    gap: 0;
    min-width: fit-content;
  }

  .bracket-round {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    min-width: 220px;
    position: relative;
  }

  .bracket-round--final {
    min-width: 240px;
  }

  /* Connector column between rounds */
  .bracket-connectors {
    width: 48px;
    min-width: 48px;
    position: relative;
  }

  /* Match card */
  .match-card {
    position: relative;
    background: var(--bg-card);
    border: 1px solid var(--border-default);
    border-radius: 10px;
    padding: 0;
    margin: 6px 0;
    cursor: pointer;
    transition: all 0.2s ease;
    overflow: hidden;
  }

  .match-card:hover {
    background: var(--bg-card-hover);
    border-color: #334155;
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }

  .match-card--live {
    background: var(--bg-card-live);
    border-color: rgba(239, 68, 68, 0.3);
  }

  .match-card--live:hover {
    border-color: rgba(239, 68, 68, 0.5);
  }

  .match-card--final {
    border-color: rgba(245, 158, 11, 0.25);
    background: linear-gradient(135deg, #141B2D 0%, #1A1A10 100%);
  }

  .match-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }

  .match-card__round-info {
    font-size: 10px;
    font-weight: 500;
    color: var(--text-muted);
    letter-spacing: 0.02em;
  }

  .match-card__time {
    font-size: 10px;
    color: var(--text-muted);
  }

  .match-card__live-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 700;
    color: var(--accent-live);
    letter-spacing: 0.05em;
  }

  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-live);
    animation: blink 1s ease-in-out infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  /* Team rows */
  .team-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    transition: background 0.15s;
    position: relative;
  }

  .team-row + .team-row {
    border-top: 1px solid rgba(255,255,255,0.04);
  }

  .team-row--winner {
    background: rgba(16, 185, 129, 0.06);
  }

  .team-row--loser {
    opacity: 0.45;
  }

  .team-color {
    width: 3px;
    height: 24px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .team-name {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .team-name--tbd {
    color: var(--text-muted);
    font-style: italic;
    font-weight: 400;
  }

  .team-score {
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    font-weight: 700;
    min-width: 24px;
    text-align: right;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  .team-score--pending {
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 400;
  }

  .team-score--live {
    color: var(--accent-live);
  }

  .penalty-tag {
    font-size: 9px;
    font-weight: 600;
    color: var(--text-muted);
    background: rgba(255,255,255,0.05);
    padding: 1px 5px;
    border-radius: 3px;
    margin-left: 2px;
  }

  .winner-icon {
    font-size: 10px;
    margin-left: 2px;
  }

  /* Live minute badge */
  .live-minute {
    position: absolute;
    top: -1px;
    right: -1px;
    background: var(--accent-live);
    color: white;
    font-size: 9px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 0 9px 0 6px;
    letter-spacing: 0.02em;
  }

  /* Final card special trophy overlay */
  .match-card--final .final-glow {
    position: absolute;
    top: -20px;
    right: -20px;
    width: 80px;
    height: 80px;
    background: radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  /* SVG Connectors */
  .connector-svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .connector-line {
    stroke: var(--connector-color);
    stroke-width: 1.5;
    fill: none;
    transition: stroke 0.3s;
  }

  .connector-line--decided {
    stroke: var(--connector-decided);
    stroke-width: 1.5;
  }

  .connector-line--live {
    stroke: var(--accent-live);
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
    animation: dash-flow 1s linear infinite;
  }

  @keyframes dash-flow {
    to { stroke-dashoffset: -7; }
  }

  /* Match detail overlay */
  .match-detail-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(8px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fade-in 0.2s ease;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .match-detail {
    background: var(--bg-card);
    border: 1px solid var(--border-default);
    border-radius: 16px;
    width: 90%;
    max-width: 440px;
    overflow: hidden;
    animation: slide-up 0.25s ease;
  }

  @keyframes slide-up {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .match-detail__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-default);
  }

  .match-detail__label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .match-detail__close {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 20px;
    cursor: pointer;
    padding: 4px;
    line-height: 1;
    transition: color 0.15s;
  }
  .match-detail__close:hover { color: var(--text-primary); }

  .match-detail__scoreboard {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    padding: 28px 20px;
  }

  .detail-team {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .detail-team__emblem {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 900;
    color: white;
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  }

  .detail-team__name {
    font-size: 13px;
    font-weight: 600;
    text-align: center;
    max-width: 120px;
  }

  .detail-vs {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .detail-score {
    font-family: 'JetBrains Mono', monospace;
    font-size: 36px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .detail-score__divider {
    color: var(--text-muted);
    font-size: 24px;
    margin: 0 4px;
  }

  .detail-status {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail-status--live {
    color: var(--accent-live);
  }

  .match-detail__info {
    padding: 0 20px 20px;
  }

  .detail-info-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    font-size: 12px;
  }

  .detail-info-row__label {
    color: var(--text-muted);
  }

  .detail-info-row__value {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .detail-penalty {
    text-align: center;
    font-size: 11px;
    color: var(--text-muted);
    padding: 4px 0 0;
  }

  /* My team highlight */
  .team-row--my-team .team-name {
    color: var(--accent-blue);
  }

  .my-team-badge {
    font-size: 9px;
    font-weight: 700;
    background: rgba(59, 130, 246, 0.15);
    color: var(--accent-blue);
    padding: 1px 5px;
    border-radius: 3px;
    margin-left: 4px;
    flex-shrink: 0;
  }

  /* Legend */
  .bracket-legend {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 20px;
    padding: 0 40px 32px;
    flex-wrap: wrap;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--text-muted);
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .legend-line {
    width: 16px;
    height: 0;
    border-top: 2px solid;
  }

  .legend-line--dashed {
    border-top-style: dashed;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .bracket-header { padding: 20px 16px 0; }
    .round-labels { padding: 16px 16px 0; }
    .bracket-scroll { padding: 20px 16px 32px; }
    .bracket-legend { padding: 0 16px 24px; }
    .bracket-round { min-width: 180px; }
    .match-card__header { padding: 5px 10px; }
    .team-row { padding: 6px 10px; }
    .team-name { font-size: 12px; }
    .team-score { font-size: 14px; }
    .bracket-header__title { font-size: 18px; }
  }
`;

// ─────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────

const MY_TEAM_ID = "t1"; // 현재 사용자의 팀

function TeamRow({ teamId, score, isWinner, isLoser, isPending, isLive, penaltyScore }) {
  const team = DEMO_TEAMS[teamId];
  const isTBD = !team;
  const isMyTeam = teamId === MY_TEAM_ID;

  return (
    <div
      className={`team-row ${isWinner ? "team-row--winner" : ""} ${isLoser ? "team-row--loser" : ""} ${isMyTeam ? "team-row--my-team" : ""}`}
    >
      <div className="team-color" style={{ background: team?.color ?? "#334155" }} />
      <span className={`team-name ${isTBD ? "team-name--tbd" : ""}`}>
        {team?.short ?? "TBD"}
      </span>
      {isMyTeam && <span className="my-team-badge">MY</span>}
      {penaltyScore != null && (
        <span className="penalty-tag">PK {penaltyScore}</span>
      )}
      <span
        className={`team-score ${isPending ? "team-score--pending" : ""} ${isLive ? "team-score--live" : ""}`}
      >
        {score ?? "—"}
      </span>
      {isWinner && <span className="winner-icon">✓</span>}
    </div>
  );
}

function MatchCard({ match, roundLabel, isFinal, onClick }) {
  const homeTeam = DEMO_TEAMS[match.homeId];
  const awayTeam = DEMO_TEAMS[match.awayId];
  const isLive = match.status === "live";
  const isCompleted = match.status === "confirmed" || match.status === "ended";
  const isPending = match.status === "scheduled";

  let homeWin = false, awayWin = false;
  if (isCompleted && match.homeScore != null && match.awayScore != null) {
    if (match.homeScore > match.awayScore) homeWin = true;
    else if (match.awayScore > match.homeScore) awayWin = true;
    else if (match.penaltyHome != null) {
      homeWin = match.penaltyHome > match.penaltyAway;
      awayWin = !homeWin;
    }
  }

  return (
    <div
      className={`match-card ${isLive ? "match-card--live" : ""} ${isFinal ? "match-card--final" : ""}`}
      onClick={() => onClick(match)}
    >
      {isFinal && <div className="final-glow" />}
      {isLive && match.minute && <div className="live-minute">{match.minute}'</div>}

      <div className="match-card__header">
        <span className="match-card__round-info">{roundLabel}</span>
        {isLive ? (
          <span className="match-card__live-tag">
            <span className="live-dot" /> LIVE
          </span>
        ) : (
          <span className="match-card__time">{getMatchDate(match)}</span>
        )}
      </div>

      <TeamRow
        teamId={match.homeId}
        score={match.homeScore}
        isWinner={homeWin}
        isLoser={isCompleted && !homeWin}
        isPending={isPending}
        isLive={isLive}
        penaltyScore={match.penaltyHome}
      />
      <TeamRow
        teamId={match.awayId}
        score={match.awayScore}
        isWinner={awayWin}
        isLoser={isCompleted && !awayWin}
        isPending={isPending}
        isLive={isLive}
        penaltyScore={match.penaltyAway}
      />
    </div>
  );
}

function MatchDetailModal({ match, onClose }) {
  const home = DEMO_TEAMS[match.homeId];
  const away = DEMO_TEAMS[match.awayId];
  const isLive = match.status === "live";
  const isCompleted = match.status === "confirmed" || match.status === "ended";

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="match-detail-overlay" onClick={onClose}>
      <div className="match-detail" onClick={(e) => e.stopPropagation()}>
        <div className="match-detail__header">
          <span className="match-detail__label">경기 상세</span>
          <button className="match-detail__close" onClick={onClose}>×</button>
        </div>

        <div className="match-detail__scoreboard">
          <div className="detail-team">
            <div className="detail-team__emblem" style={{ background: home?.color ?? "#334155" }}>
              {home?.short?.[0] ?? "?"}
            </div>
            <span className="detail-team__name">{home?.name ?? "TBD"}</span>
          </div>

          <div className="detail-vs">
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span className="detail-score">{match.homeScore ?? "—"}</span>
              <span className="detail-score__divider">:</span>
              <span className="detail-score">{match.awayScore ?? "—"}</span>
            </div>
            {match.penaltyHome != null && (
              <div className="detail-penalty">
                PK {match.penaltyHome} - {match.penaltyAway}
              </div>
            )}
            <span className={`detail-status ${isLive ? "detail-status--live" : ""}`}>
              {isLive ? `진행 중 ${match.minute}'` : isCompleted ? "경기 종료" : "예정"}
            </span>
          </div>

          <div className="detail-team">
            <div className="detail-team__emblem" style={{ background: away?.color ?? "#334155" }}>
              {away?.short?.[0] ?? "?"}
            </div>
            <span className="detail-team__name">{away?.name ?? "TBD"}</span>
          </div>
        </div>

        <div className="match-detail__info">
          <div className="detail-info-row">
            <span className="detail-info-row__label">일시</span>
            <span className="detail-info-row__value">{getMatchDate(match) || "미정"}</span>
          </div>
          <div className="detail-info-row">
            <span className="detail-info-row__label">장소</span>
            <span className="detail-info-row__value">효창운동장</span>
          </div>
          <div className="detail-info-row" style={{ borderBottom: "none" }}>
            <span className="detail-info-row__label">상태</span>
            <span className="detail-info-row__value">
              {match.status === "confirmed" ? "확정" : match.status === "live" ? "진행 중" : match.status === "ended" ? "종료" : "예정"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────
// CONNECTOR LINES (SVG)
// ─────────────────────────────

function ConnectorColumn({ prevMatchCount, nextMatchCount, prevStatuses, nextStatuses }) {
  const h = 100;
  const segH = h / prevMatchCount;
  const nextSegH = h / nextMatchCount;

  const paths = [];
  for (let i = 0; i < nextMatchCount; i++) {
    const topIdx = i * 2;
    const botIdx = i * 2 + 1;
    const topY = segH * topIdx + segH / 2;
    const botY = segH * botIdx + segH / 2;
    const midY = nextSegH * i + nextSegH / 2;

    const topDecided = prevStatuses[topIdx] === "confirmed" || prevStatuses[topIdx] === "ended";
    const botDecided = prevStatuses[botIdx] === "confirmed" || prevStatuses[botIdx] === "ended";
    const topLive = prevStatuses[topIdx] === "live";
    const botLive = prevStatuses[botIdx] === "live";

    const topClass = topLive ? "connector-line--live" : topDecided ? "connector-line--decided" : "connector-line";
    const botClass = botLive ? "connector-line--live" : botDecided ? "connector-line--decided" : "connector-line";

    paths.push(
      <path key={`t${i}`} className={topClass} d={`M 0,${topY}% L 50%,${topY}% L 50%,${midY}% L 100%,${midY}%`} />,
      <path key={`b${i}`} className={botClass} d={`M 0,${botY}% L 50%,${botY}% L 50%,${midY}%`} />
    );
  }

  return (
    <div className="bracket-connectors">
      <svg className="connector-svg" viewBox={`0 0 48 ${h}`} preserveAspectRatio="none">
        {paths}
      </svg>
    </div>
  );
}

// ─────────────────────────────
// MAIN BRACKET COMPONENT
// ─────────────────────────────

export default function TournamentBracket() {
  const [selectedMatch, setSelectedMatch] = useState(null);

  const rounds = useMemo(() => {
    const grouped = {};
    DEMO_MATCHES.forEach((m) => {
      if (!grouped[m.round]) grouped[m.round] = [];
      grouped[m.round].push(m);
    });
    return Object.keys(grouped)
      .sort((a, b) => +a - +b)
      .map((k) => grouped[+k].sort((a, b) => a.position - b.position));
  }, []);

  const totalRounds = rounds.length;

  const handleMatchClick = useCallback((match) => {
    setSelectedMatch(match);
  }, []);

  const hasLive = DEMO_MATCHES.some((m) => m.status === "live");

  return (
    <>
      <style>{styles}</style>
      <div className="bracket-root">
        {/* Header */}
        <div className="bracket-header">
          <div className="bracket-header__top">
            <span className="bracket-header__trophy">🏆</span>
            <span className="bracket-header__title">제5회 기자협회 축구대회</span>
            <span className="bracket-header__badge badge--tournament">토너먼트</span>
            {hasLive && (
              <span className="bracket-header__badge badge--live">
                <span className="live-dot" /> LIVE
              </span>
            )}
          </div>
          <div className="bracket-header__sub">
            서울 · 2026.03.11 – 03.13 · 8팀 참가
          </div>
        </div>

        {/* Round labels */}
        <div className="round-labels">
          {rounds.map((_, ri) => {
            const label = getRoundLabel(ri, totalRounds);
            const hasLiveInRound = rounds[ri].some((m) => m.status === "live");
            const allDone = rounds[ri].every((m) => m.status === "confirmed" || m.status === "ended");
            return (
              <div
                key={ri}
                className={`round-label ${hasLiveInRound ? "round-label--live" : allDone ? "" : ri === rounds.length - 1 ? "round-label--active" : ""}`}
              >
                {label}
              </div>
            );
          })}
        </div>

        {/* Bracket */}
        <div className="bracket-scroll">
          <div className="bracket-grid">
            {rounds.map((roundMatches, ri) => {
              const label = getRoundLabel(ri, totalRounds);
              const isFinalRound = ri === totalRounds - 1;

              return (
                <div key={ri} style={{ display: "flex" }}>
                  <div className={`bracket-round ${isFinalRound ? "bracket-round--final" : ""}`}>
                    {roundMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        roundLabel={`${label} ${match.position + 1}`}
                        isFinal={isFinalRound}
                        onClick={handleMatchClick}
                      />
                    ))}
                  </div>
                  {ri < totalRounds - 1 && (
                    <ConnectorColumn
                      prevMatchCount={roundMatches.length}
                      nextMatchCount={rounds[ri + 1].length}
                      prevStatuses={roundMatches.map((m) => m.status)}
                      nextStatuses={rounds[ri + 1].map((m) => m.status)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="bracket-legend">
          <div className="legend-item">
            <div className="legend-dot" style={{ background: "var(--accent-win)" }} />
            승리팀
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: "var(--accent-live)" }} />
            진행 중
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: "var(--accent-blue)" }} />
            우리 팀
          </div>
          <div className="legend-item">
            <div className="legend-line" style={{ borderColor: "var(--connector-decided)" }} />
            결과 확정
          </div>
          <div className="legend-item">
            <div className="legend-line legend-line--dashed" style={{ borderColor: "var(--accent-live)" }} />
            진행 중
          </div>
        </div>

        {/* Match detail modal */}
        {selectedMatch && (
          <MatchDetailModal
            match={selectedMatch}
            onClose={() => setSelectedMatch(null)}
          />
        )}
      </div>
    </>
  );
}

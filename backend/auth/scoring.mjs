// 등급/티어 시스템 — 점수 산정 및 등급 결정 순수 함수

/**
 * 대전형 스포츠 경기 포인트 계산
 * @param {"win"|"draw"|"loss"} result
 * @param {number} winStreak - 현재 연승 횟수 (이번 경기 전)
 * @returns {{ points: number, newWinStreak: number }}
 */
export function calculateMatchPoints(result, winStreak) {
  const base = 3;
  const bonus = result === "win" ? 4 : result === "draw" ? 1 : 0;
  const streakBonus = result === "win" && winStreak >= 1 ? winStreak : 0;
  const newWinStreak = result === "win" ? winStreak + 1 : 0;
  return { points: base + bonus + streakBonus, newWinStreak };
}

/**
 * 골 포인트 계산 (1골당 2점, 개인만 적용)
 * @param {number} goalCount
 * @returns {number}
 */
export function calculateGoalPoints(goalCount) {
  return goalCount * 2;
}

/**
 * 동아리형 활동 포인트 (고정 5점)
 * @returns {number}
 */
export function calculateActivityPoints() {
  return 5;
}

/**
 * 개인 등급 결정 (축구/풋살)
 * @param {number} points
 * @returns {"B"|"S"|"A"|"SP"|"P"}
 */
export function determinePlayerTier(points) {
  if (points >= 701) return "P";
  if (points >= 301) return "SP";
  if (points >= 101) return "A";
  if (points >= 25) return "S";
  return "B";
}

/**
 * 팀 등급 결정 (축구/풋살)
 * @param {number} tp
 * @returns {"Rookie"|"Club"|"Crew"|"Elite"|"Legend"}
 */
export function determineTeamTier(tp) {
  if (tp >= 2001) return "Legend";
  if (tp >= 801) return "Elite";
  if (tp >= 251) return "Crew";
  if (tp >= 51) return "Club";
  return "Rookie";
}

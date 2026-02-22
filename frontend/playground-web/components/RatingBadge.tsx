"use client";

const playerTierConfig: Record<string, { bg: string; text: string; label: string }> = {
  B: { bg: "bg-gray-500/20", text: "text-gray-400", label: "비기너" },
  S: { bg: "bg-green-500/20", text: "text-green-400", label: "스타터" },
  A: { bg: "bg-blue-500/20", text: "text-blue-400", label: "아마추어" },
  SP: { bg: "bg-purple-500/20", text: "text-purple-400", label: "세미프로" },
  P: { bg: "bg-fuchsia-500/20", text: "text-fuchsia-400", label: "프로" },
};

const teamTierConfig: Record<string, { bg: string; text: string; label: string }> = {
  Rookie: { bg: "bg-gray-500/20", text: "text-gray-400", label: "루키" },
  Club: { bg: "bg-green-500/20", text: "text-green-400", label: "클럽" },
  Crew: { bg: "bg-blue-500/20", text: "text-blue-400", label: "크루" },
  Elite: { bg: "bg-purple-500/20", text: "text-purple-400", label: "엘리트" },
  Legend: { bg: "bg-fuchsia-500/20", text: "text-fuchsia-400", label: "레전드" },
};

const sizeMap = { sm: "text-xs px-1.5 py-0.5", md: "text-sm px-2 py-0.5", lg: "text-base px-3 py-1" };

interface RatingBadgeProps {
  tier: string;
  type: "player" | "team";
  size?: "sm" | "md" | "lg";
}

export default function RatingBadge({ tier, type, size = "sm" }: RatingBadgeProps) {
  const config = type === "player" ? playerTierConfig : teamTierConfig;
  const c = config[tier] || { bg: "bg-gray-500/20", text: "text-gray-400", label: tier };
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${c.bg} ${c.text} ${sizeMap[size]}`}>
      {c.label}
    </span>
  );
}

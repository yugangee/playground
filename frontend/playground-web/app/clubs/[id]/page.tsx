import { clubs } from "../data";
import { notFound } from "next/navigation";
import { MapPin, Trophy, Users, Calendar } from "lucide-react";

export function generateStaticParams() {
  return clubs.map(c => ({ id: String(c.id) }));
}

export default async function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const club = clubs.find((c) => c.id === Number(id));
  if (!club) notFound();

  const positionLabels = [
    { key: "gk", label: "GK" },
    { key: "df", label: "DF" },
    { key: "mf", label: "MF" },
    { key: "fw", label: "FW" },
  ] as const;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{club.name}</h1>
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={12} className="text-gray-500" />
              <p className="text-gray-400 text-sm">{club.sido} {club.sigungu}</p>
            </div>
          </div>
          <span className="text-sm px-3 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-400">{club.style}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Trophy,   label: "전적",  value: club.record },
            { icon: Users,    label: "멤버",  value: `${club.members}명` },
            { icon: Calendar, label: "창단",  value: `${club.founded}년` },
            { icon: Trophy,   label: "승률",  value: `${club.winRate}%` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={13} className="text-fuchsia-400" />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
              <p className="text-white font-semibold">{value}</p>
            </div>
          ))}
        </div>

        {/* 포지션별 인원 */}
        <div className="bg-white/5 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-3">포지션별 인원</p>
          <div className="grid grid-cols-4 gap-2">
            {positionLabels.map(({ key, label }) => (
              <div key={key} className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-400">{label}</span>
                <span className="text-white font-semibold text-sm">{club.positions[key]}명</span>
              </div>
            ))}
          </div>
        </div>

        {/* 활동 가능지역 */}
        <div className="bg-white/5 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-2">활동 가능지역</p>
          <div className="flex gap-2">
            {club.areas.map((area) => (
              <span key={area} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/5 text-gray-300 border border-white/10">
                <MapPin size={10} className="text-fuchsia-400" />
                {area}
              </span>
            ))}
          </div>
        </div>

        <button
          className="w-full py-2.5 rounded-lg font-semibold text-sm text-white"
          style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}
        >
          경기 제안하기
        </button>
      </div>
    </div>
  );
}

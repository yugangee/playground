export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left: Brand panel */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-shrink-0 flex-col justify-between bg-slate-900 p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="9.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.5c0 0-3 3-3 9.5s3 9.5 3 9.5M12 2.5c0 0 3 3 3 9.5s-3 9.5-3 9.5M2.5 12h19M4 7h16M4 17h16" />
            </svg>
          </div>
          <span className="text-xl font-bold text-white">Playground</span>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-[2.5rem] font-bold leading-tight text-white">
              모든 축구인들을<br />하나로
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-400">
              팀 관리부터 리그 운영까지.<br />
              당신의 축구팀을 위한 올인원 플랫폼.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { label: '팀원 관리 & 회비 정산', desc: '선수 등록, 등번호, 포지션, 회비까지' },
              { label: '경기 일정 & 출석 확인', desc: '공지사항, 투표, 경기 확정' },
              { label: '리그 & 토너먼트 운영', desc: '대진표, 순위표, 전적 관리' },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-200">{label}</div>
                  <div className="text-xs text-slate-500">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-700">© 2025 Playground. All rights reserved.</p>
      </div>

      {/* Right: Form */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.5s-3 3-3 9.5 3 9.5 3 9.5M12 2.5s3 3 3 9.5-3 9.5-3 9.5M2.5 12h19M4 7h16M4 17h16" />
              </svg>
            </div>
            <span className="text-lg font-bold text-slate-900">Playground</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

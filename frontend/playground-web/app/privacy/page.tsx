"use client";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-8" style={{ color: "var(--text-primary)" }}>
        개인정보처리방침
      </h1>

      <div className="space-y-8 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            1. 개인정보의 수집 및 이용 목적
          </h2>
          <p>
            Playground(이하 "서비스")는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>회원 가입 및 관리: 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리</li>
            <li>서비스 제공: 팀 관리, 경기 일정 관리, 회비 정산, AI 영상 분석 등 서비스 제공</li>
            <li>마케팅 및 광고 활용: 신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            2. 수집하는 개인정보 항목
          </h2>
          <p>서비스는 회원가입, 서비스 이용 등을 위해 아래와 같은 개인정보를 수집하고 있습니다.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>필수항목: 이메일 주소, 비밀번호, 이름(닉네임)</li>
            <li>선택항목: 프로필 사진, 전화번호, 생년월일, 소속 팀 정보</li>
            <li>자동 수집 항목: 접속 IP, 쿠키, 서비스 이용 기록, 접속 로그, 기기 정보</li>
            <li>소셜 로그인 시: 카카오/구글 계정 정보 (이메일, 프로필 사진)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            3. 개인정보의 보유 및 이용 기간
          </h2>
          <p>
            서비스는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>회원 정보: 회원 탈퇴 시까지 (탈퇴 후 30일 이내 파기)</li>
            <li>전자상거래 관련 기록: 5년 (전자상거래법)</li>
            <li>접속 로그 기록: 3개월 (통신비밀보호법)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            4. 개인정보의 제3자 제공
          </h2>
          <p>
            서비스는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            5. 개인정보의 파기
          </h2>
          <p>
            서비스는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>전자적 파일 형태: 복구 및 재생이 불가능한 방법으로 영구 삭제</li>
            <li>기록물, 인쇄물, 서면: 분쇄기로 분쇄하거나 소각</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            6. 이용자의 권리와 행사 방법
          </h2>
          <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>개인정보 열람 요구</li>
            <li>오류 등이 있을 경우 정정 요구</li>
            <li>삭제 요구</li>
            <li>처리정지 요구</li>
          </ul>
          <p className="mt-2">
            위 권리 행사는 서비스 내 설정 메뉴 또는 개인정보 보호책임자에게 서면, 이메일로 연락하시면 처리됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            7. 개인정보의 안전성 확보 조치
          </h2>
          <p>서비스는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육</li>
            <li>기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화</li>
            <li>물리적 조치: 전산실, 자료보관실 등의 접근통제</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            8. 개인정보 보호책임자
          </h2>
          <p>
            서비스는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
          </p>
          <div className="mt-3 p-4 rounded-lg" style={{ background: "var(--card-bg)" }}>
            <p><strong>개인정보 보호책임자</strong></p>
            <p className="mt-1">서울경제신문 Playground 팀</p>
            <p>이메일: playground@sedaily.com</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            9. 개인정보처리방침의 변경
          </h2>
          <p>
            이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
          </p>
        </section>

        <section className="pt-4 border-t" style={{ borderColor: "var(--card-border)" }}>
          <p><strong>시행일자:</strong> 2025년 3월 12일</p>
        </section>
      </div>
    </div>
  );
}

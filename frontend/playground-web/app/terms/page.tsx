"use client";

export default function TermsOfService() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-8" style={{ color: "var(--text-primary)" }}>
        이용약관
      </h1>

      <div className="space-y-8 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            제1조 (목적)
          </h2>
          <p>
            이 약관은 서울경제신문(이하 "회사")이 제공하는 Playground 서비스(이하 "서비스")의 이용과 관련하여
            회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            제2조 (정의)
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>"서비스"</strong>란 회사가 제공하는 아마추어 스포츠 팀 관리, 경기 일정 관리, 회비 정산, AI 영상 분석 등 관련 제반 서비스를 의미합니다.</li>
            <li><strong>"이용자"</strong>란 이 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.</li>
            <li><strong>"회원"</strong>이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 정보를 지속적으로 제공받으며, 서비스를 계속적으로 이용할 수 있는 자를 말합니다.</li>
            <li><strong>"팀"</strong>이란 서비스 내에서 스포츠 활동을 함께 하는 회원들의 그룹을 말합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            제3조 (약관의 효력 및 변경)
          </h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>이 약관은 서비스를 이용하고자 하는 모든 이용자에게 그 효력이 발생합니다.</li>
            <li>회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있습니다.</li>
            <li>회사가 약관을 변경할 경우에는 적용일자 및 변경사유를 명시하여 현행 약관과 함께 서비스 내 공지사항에 그 적용일자 7일 전부터 공지합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            제4조 (회원가입)
          </h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>이용자는 회사가 정한 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</li>
            <li>회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다.
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>가입신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우</li>
                <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
                <li>기타 회원으로 등록하는 것이 서비스 운영에 현저히 지장이 있다고 판단되는 경우</li>
              </ul>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            제5조 (서비스의 제공)
          </h2>
          <p>회사는 다음과 같은 서비스를 제공합니다.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>팀 생성 및 관리 서비스</li>
            <li>경기 일정 관리 및 출석 체크 서비스</li>
            <li>회비 및 재정 관리 서비스</li>
            <li>실시간 채팅 서비스</li>
            <li>AI 영상 분석 서비스</li>
            <li>대회/리그 운영 서비스</li>
            <li>선수/팀 통계 및 분석 서비스</li>
            <li>기타 회사가 추가 개발하거나 제휴를 통해 제공하는 서비스</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            제6조 (서비스의 변경 및 중단)
          </h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>회사는 운영상, 기술상의 필요에 따라 제공하고 있는 서비스를 변경할 수 있습니다.</li>
            <li>회사는 다음 각 호에 해당하는 경우 서비스의 전부 또는 일부를 제한하거나 중단할 수 있습니다.
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>서비스용 설비의 보수 등 공사로 인한 부득이한 경우</li>
                <li>천재지변, 국가비상사태 등 불가항력적 사유가 있는 경우</li>
                <li>기타 회사가 서비스를 제공할 수 없는 사유가 발생한 경우</li>
              </ul>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            제7조 (회원의 의무)
          </h2>
          <p>회원은 다음 각 호의 행위를 하여서는 안 됩니다.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>회원가입 신청 또는 변경 시 허위 내용을 등록하는 행위</li>
            <li>타인의 정보를 도용하는 행위</li>
            <li>회사가 게시한 정보를 변경하는 행위</li>
            <li>회사 및 제3자의 지적재산권을 침해하는 행위</li>
            <li>회사 및 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
            <li>외설 또는 폭력적인 메시지, 화상, 음성 등을 게시하는 행위</li>
            <li>영리를 목적으로 서비스를 이용하는 행위</li>
            <li>기타 불법적이거나 부당한 행위</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            제8조 (저작권의 귀속)
          </h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>서비스에 의해 작성된 저작물에 대한 저작권 기타 지적재산권은 회사에 귀속됩니다.</li>
            <li>회원이 서비스 내에 게시한 게시물의 저작권은 해당 회원에게 귀속됩니다. 단, 회사는 서비스 운영, 홍보 등의 목적으로 회원의 게시물을 사용할 수 있습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            제9조 (회원탈퇴 및 자격상실)
          </h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>회원은 언제든지 서비스 내 설정 메뉴를 통해 탈퇴를 요청할 수 있으며, 회사는 즉시 회원탈퇴를 처리합니다.</li>
            <li>회원이 다음 각 호의 사유에 해당하는 경우, 회사는 회원자격을 제한 또는 정지시킬 수 있습니다.
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>가입 신청 시에 허위 내용을 등록한 경우</li>
                <li>다른 사람의 서비스 이용을 방해하거나 정보를 도용하는 등 질서를 위협하는 경우</li>
                <li>서비스를 이용하여 법령 또는 이 약관이 금지하는 행위를 하는 경우</li>
              </ul>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            제10조 (면책조항)
          </h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적인 사유로 인해 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
            <li>회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</li>
            <li>회사는 회원이 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않으며, 서비스를 통하여 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            제11조 (분쟁해결)
          </h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>회사는 이용자가 제기하는 정당한 의견이나 불만을 반영하고, 그 피해를 보상처리하기 위하여 고객센터를 운영합니다.</li>
            <li>회사와 이용자 간에 발생한 분쟁에 관한 소송은 대한민국 법원을 관할 법원으로 합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            제12조 (기타)
          </h2>
          <p>
            이 약관에 명시되지 않은 사항은 관련 법령 및 회사가 정한 서비스의 세부이용지침 등의 규정에 따릅니다.
          </p>
        </section>

        <section className="pt-4 border-t" style={{ borderColor: "var(--card-border)" }}>
          <p><strong>시행일자:</strong> 2025년 3월 12일</p>
        </section>
      </div>
    </div>
  );
}

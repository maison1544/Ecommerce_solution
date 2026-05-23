export default function PrivacyPage() {
  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-4xl text-black font-bold tracking-wider uppercase mb-2">
            개인정보처리방침
          </h1>
          <p className="text-sm lg:text-base text-gray-600">
            고객님의 개인정보를 소중히 다룹니다
          </p>
          <div className="h-px bg-black mt-5" />
        </div>

        <div className="prose max-w-none space-y-6 text-sm text-gray-700">
          <section>
            <p className="leading-relaxed mb-4">
              솔루션 스튜디오(이하 "회사"라 함)는 개인정보보호법 제30조에 따라 정보주체의 개인정보를 
              보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 
              다음과 같이 개인정보 처리방침을 수립·공개합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제1조 (개인정보의 처리 목적)</h2>
            <p className="leading-relaxed mb-2">회사는 다음의 목적을 위하여 개인정보를 처리합니다. 
              처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 
              이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 
              필요한 조치를 이행할 예정입니다.</p>
            
            <ol className="list-decimal list-inside space-y-2 leading-relaxed">
              <li>회원 가입 및 관리: 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 
                회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지 목적</li>
              <li>재화 또는 서비스 제공: 물품배송, 서비스 제공, 계약서·청구서 발송, 콘텐츠 제공, 
                맞춤서비스 제공, 본인인증, 요금결제·정산</li>
              <li>마케팅 및 광고에의 활용: 신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 및 
                광고성 정보 제공 및 참여기회 제공, 인구통계학적 특성에 따른 서비스 제공 및 
                광고 게재, 서비스의 유효성 확인</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제2조 (개인정보의 처리 및 보유 기간)</h2>
            <ol className="list-decimal list-inside space-y-2 leading-relaxed">
              <li>회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 
                수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</li>
              <li>각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>회원 가입 및 관리: 회원 탈퇴 시까지</li>
                  <li>재화 또는 서비스 제공: 재화·서비스 공급완료 및 요금결제·정산 완료시까지</li>
                  <li>전자상거래에서의 계약·청약철회 등에 관한 기록: 5년</li>
                  <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
                  <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제3조 (처리하는 개인정보의 항목)</h2>
            <p className="leading-relaxed mb-2">회사는 다음의 개인정보 항목을 처리하고 있습니다:</p>
            
            <ol className="list-decimal list-inside space-y-3 leading-relaxed">
              <li>회원 가입 및 관리
                <ul className="list-disc list-inside ml-6 mt-1">
                  <li>필수항목: 이름, 이메일, 비밀번호, 휴대전화번호</li>
                  <li>선택항목: 주소, 생년월일</li>
                </ul>
              </li>
              <li>재화 또는 서비스 제공
                <ul className="list-disc list-inside ml-6 mt-1">
                  <li>필수항목: 이름, 배송지 주소, 연락처</li>
                  <li>결제정보: 신용카드 정보, 은행계좌 정보</li>
                </ul>
              </li>
              <li>인터넷 서비스 이용과정에서 자동으로 생성되어 수집되는 정보
                <ul className="list-disc list-inside ml-6 mt-1">
                  <li>IP주소, 쿠키, MAC주소, 서비스 이용 기록, 방문 기록, 불량 이용 기록 등</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제4조 (개인정보의 제3자 제공)</h2>
            <ol className="list-decimal list-inside space-y-2 leading-relaxed">
              <li>회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 
                처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에 
                해당하는 경우에만 개인정보를 제3자에게 제공합니다.</li>
              <li>회사는 다음과 같이 개인정보를 제3자에게 제공하고 있습니다:
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>배송업체: 상품 배송을 위한 정보 제공 (수령인 이름, 주소, 연락처)</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제5조 (개인정보처리의 위탁)</h2>
            <ol className="list-decimal list-inside space-y-2 leading-relaxed">
              <li>회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>결제처리: PG사 (신용카드 결제 처리)</li>
                  <li>배송업무: 물류업체 (상품 배송)</li>
                </ul>
              </li>
              <li>회사는 위탁계약 체결 시 개인정보 보호법 제26조에 따라 위탁업무 수행목적 외 
                개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 
                손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 
                안전하게 처리하는지를 감독하고 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제6조 (정보주체의 권리·의무 및 그 행사방법)</h2>
            <ol className="list-decimal list-inside space-y-2 leading-relaxed">
              <li>정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 
                권리를 행사할 수 있습니다.</li>
              <li>제1항에 따른 권리 행사는 회사에 대해 개인정보 보호법 시행령 제41조제1항에 따라 
                서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 회사는 이에 대해 
                지체 없이 조치하겠습니다.</li>
              <li>정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한 경우에는 
                회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를 이용하거나 제공하지 않습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제7조 (개인정보의 파기)</h2>
            <ol className="list-decimal list-inside space-y-2 leading-relaxed">
              <li>회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 
                지체없이 해당 개인정보를 파기합니다.</li>
              <li>개인정보 파기의 절차 및 방법은 다음과 같습니다:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>파기절차: 불필요하게 된 개인정보는 개인정보 보호책임자의 승인절차를 거쳐 파기합니다.</li>
                  <li>파기방법: 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다.</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제8조 (개인정보 보호책임자)</h2>
            <p className="leading-relaxed mb-2">
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 
              정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p><strong>개인정보 보호책임자</strong></p>
              <ul className="list-none space-y-1 mt-2">
                <li>성명: 솔루션 스튜디오</li>
                <li>전화번호: 010-9999-9999</li>
                <li>이메일: solution@gmail.com</li>
              </ul>
            </div>
          </section>

          <section className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              시행일자: 2025년 1월 1일<br />
              본 개인정보처리방침은 2025년 1월 1일부터 적용됩니다.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

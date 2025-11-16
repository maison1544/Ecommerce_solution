export default function TermsPage() {
  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-4xl text-black font-bold tracking-wider uppercase mb-2">
            이용약관
          </h1>
          <p className="text-sm lg:text-base text-gray-600">
            서비스 이용을 위한 약관입니다
          </p>
          <div className="h-px bg-black mt-5" />
        </div>

        <div className="prose max-w-none space-y-6 text-sm text-gray-700">
          <section>
            <h2 className="text-lg font-bold mb-3">제1조 (목적)</h2>
            <p className="leading-relaxed">
              본 약관은 솔루션 스튜디오(이하 "회사"라 함)가 운영하는 인터넷 쇼핑몰에서 
              제공하는 전자상거래 관련 서비스(이하 "서비스"라 함)를 이용함에 있어 
              회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제2조 (정의)</h2>
            <ol className="list-decimal list-inside space-y-2 leading-relaxed">
              <li>"회사"란 재화 또는 용역을 이용자에게 제공하기 위하여 컴퓨터 등 정보통신설비를 이용하여 
                재화 또는 용역을 거래할 수 있도록 설정한 가상의 영업장을 말하며, 아울러 사이버몰을 
                운영하는 사업자의 의미로도 사용합니다.</li>
              <li>"이용자"란 "회사"에 접속하여 본 약관에 따라 "회사"가 제공하는 서비스를 받는 
                회원 및 비회원을 말합니다.</li>
              <li>"회원"이라 함은 "회사"에 개인정보를 제공하여 회원등록을 한 자로서, 
                "회사"의 정보를 지속적으로 제공받으며, "회사"가 제공하는 서비스를 계속적으로 
                이용할 수 있는 자를 말합니다.</li>
              <li>"비회원"이라 함은 회원에 가입하지 않고 "회사"가 제공하는 서비스를 이용하는 자를 말합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제3조 (약관의 명시와 개정)</h2>
            <ol className="list-decimal list-inside space-y-2 leading-relaxed">
              <li>"회사"는 이 약관의 내용과 상호, 영업소 소재지, 대표자의 성명, 사업자등록번호, 
                연락처 등을 이용자가 알 수 있도록 초기 서비스화면에 게시합니다.</li>
              <li>"회사"는 약관의규제등에관한법률, 전자거래기본법, 전자서명법, 정보통신망이용촉진등에관한법률, 
                방문판매등에관한법률, 소비자보호법 등 관련법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.</li>
              <li>"회사"가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 
                그 적용일자 7일 이전부터 적용일자 전일까지 공지합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제4조 (서비스의 제공 및 변경)</h2>
            <ol className="list-decimal list-inside space-y-2 leading-relaxed">
              <li>"회사"는 다음과 같은 업무를 수행합니다:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>재화 또는 용역에 대한 정보 제공 및 구매계약의 체결</li>
                  <li>구매계약이 체결된 재화 또는 용역의 배송</li>
                  <li>기타 "회사"가 정하는 업무</li>
                </ul>
              </li>
              <li>"회사"는 재화의 품절 또는 기술적 사양의 변경 등의 경우에는 장차 체결되는 
                계약에 의해 제공할 재화·용역의 내용을 변경할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제5조 (서비스의 중단)</h2>
            <ol className="list-decimal list-inside space-y-2 leading-relaxed">
              <li>"회사"는 컴퓨터 등 정보통신설비의 보수점검·교체 및 고장, 통신의 두절 등의 사유가 
                발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.</li>
              <li>제1항에 의한 서비스 중단의 경우에는 "회사"는 이용자에게 통지합니다.</li>
              <li>"회사"는 제1항의 사유로 서비스의 제공이 일시적으로 중단됨으로 인하여 
                이용자 또는 제3자가 입은 손해에 대하여 배상합니다. 단, "회사"의 고의 또는 과실이 없음을 
                입증하는 경우에는 그러하지 아니합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제6조 (회원가입)</h2>
            <ol className="list-decimal list-inside space-y-2 leading-relaxed">
              <li>이용자는 "회사"가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 
                의사표시를 함으로서 회원가입을 신청합니다.</li>
              <li>"회사"는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각호에 해당하지 
                않는 한 회원으로 등록합니다:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
                  <li>기타 회원으로 등록하는 것이 "회사"의 기술상 현저히 지장이 있다고 판단되는 경우</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제7조 (회원 탈퇴 및 자격 상실 등)</h2>
            <ol className="list-decimal list-inside space-y-2 leading-relaxed">
              <li>회원은 "회사"에 언제든지 탈퇴를 요청할 수 있으며 "회사"는 즉시 회원탈퇴를 처리합니다.</li>
              <li>회원이 다음 각호의 사유에 해당하는 경우, "회사"는 회원자격을 제한 및 정지시킬 수 있습니다:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>가입 신청 시에 허위 내용을 등록한 경우</li>
                  <li>타인의 "회사" 이용을 방해하거나 그 정보를 도용하는 등 전자거래질서를 위협하는 경우</li>
                  <li>"회사"를 이용하여 법령과 이 약관이 금지하거나 공서양속에 반하는 행위를 하는 경우</li>
                </ul>
              </li>
            </ol>
          </section>

          <section className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              시행일자: 2025년 1월 1일<br />
              본 약관은 2025년 1월 1일부터 시행됩니다.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function AboutPage() {
  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-4xl text-black font-bold tracking-wider uppercase mb-2">
            회사소개
          </h1>
          <p className="text-sm lg:text-base text-gray-600">
            솔루션 스튜디오를 소개합니다
          </p>
          <div className="h-px bg-black mt-5" />
        </div>

        <div className="prose max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4">회사 개요</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              솔루션 스튜디오는 고객 만족을 최우선으로 하는 종합 전자제품 쇼핑몰입니다.
              최신 기술 제품부터 생활 가전까지 다양한 제품을 합리적인 가격에 제공하고 있습니다.
            </p>
            <p className="text-gray-700 leading-relaxed">
              2020년 설립 이후 고객님들의 성원에 힘입어 지속적으로 성장하고 있으며,
              항상 최고의 서비스와 품질로 보답하겠습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">우리의 비전</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>고객 중심의 서비스 제공</li>
              <li>최고 품질의 제품 공급</li>
              <li>합리적인 가격 정책</li>
              <li>신속하고 안전한 배송</li>
              <li>지속적인 혁신과 발전</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">주요 서비스</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-bold mb-2">정품 보증</h3>
                <p className="text-sm text-gray-700">
                  모든 제품은 정품 인증을 받은 제품만을 취급합니다.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-bold mb-2">빠른 배송</h3>
                <p className="text-sm text-gray-700">
                  당일 또는 익일 배송으로 빠르게 제품을 받아보실 수 있습니다.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-bold mb-2">A/S 지원</h3>
                <p className="text-sm text-gray-700">
                  구매 후에도 완벽한 A/S 서비스를 제공합니다.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-bold mb-2">24시간 고객센터</h3>
                <p className="text-sm text-gray-700">
                  언제든지 문의하실 수 있는 24시간 고객센터를 운영합니다.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">회사 정보</h2>
            <div className="bg-gray-50 p-6 rounded-lg space-y-2 text-sm">
              <p><strong>법인명(상호):</strong> 솔루션 스튜디오</p>
              <p><strong>대표자(성명):</strong> 솔루션 스튜디오</p>
              <p><strong>전화:</strong> 010-9999-9999</p>
              <p><strong>주소:</strong> 서울특별시 은평구 35678</p>
              <p><strong>사업자 등록번호:</strong> 999-99-99999</p>
              <p><strong>통신판매업 신고:</strong> 제2025-서울은평-9999호</p>
              <p><strong>이메일:</strong> solution@gmail.com</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

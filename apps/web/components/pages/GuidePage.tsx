export default function GuidePage() {
  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-4xl text-black font-bold tracking-wider uppercase mb-2">
            이용안내
          </h1>
          <p className="text-sm lg:text-base text-gray-600">
            쇼핑몰 이용방법을 안내합니다
          </p>
          <div className="h-px bg-black mt-5" />
        </div>

        <div className="prose max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4">회원가입</h2>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <p>
                회원가입을 하시면 다양한 혜택과 편리한 서비스를 이용하실 수 있습니다.
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>상단의 '로그인' 버튼을 클릭합니다.</li>
                <li>'회원가입' 링크를 클릭합니다.</li>
                <li>필수 정보를 입력하고 약관에 동의합니다.</li>
                <li>'회원가입' 버튼을 클릭하여 가입을 완료합니다.</li>
              </ol>
              <div className="bg-blue-50 p-4 rounded-lg mt-4">
                <p className="font-bold mb-2">회원 혜택</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>구매 시 적립금 적립</li>
                  <li>회원 전용 할인 쿠폰 제공</li>
                  <li>신제품 및 특가 정보 우선 안내</li>
                  <li>주문 내역 및 배송 조회</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">주문/결제 안내</h2>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <h3 className="font-bold mt-4">주문 절차</h3>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>원하시는 상품을 선택하고 '바로 구매하기' 또는 '장바구니' 버튼을 클릭합니다.</li>
                <li>장바구니에서 구매할 상품을 확인하고 수량을 조절합니다.</li>
                <li>'구매하기' 버튼을 클릭하여 주문서 작성 페이지로 이동합니다.</li>
                <li>배송지 정보와 결제 방법을 선택합니다.</li>
                <li>주문 내용을 최종 확인하고 '결제하기'를 클릭합니다.</li>
              </ol>

              <h3 className="font-bold mt-4">결제 방법</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>신용카드 결제 (국내 모든 카드 사용 가능)</li>
                <li>실시간 계좌이체</li>
                <li>무통장 입금</li>
                <li>카카오페이, 네이버페이 등 간편결제</li>
              </ul>

              <div className="bg-yellow-50 p-4 rounded-lg mt-4">
                <p className="font-bold mb-2">⚠️ 주의사항</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>무통장 입금의 경우 입금 확인 후 배송이 시작됩니다.</li>
                  <li>주문 후 7일 이내에 입금하지 않으시면 자동으로 주문이 취소됩니다.</li>
                  <li>결제 완료 후에는 마이페이지에서 주문 내역을 확인하실 수 있습니다.</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">배송 안내</h2>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <h3 className="font-bold">배송 방법 및 기간</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>배송 방법: 택배 (CJ대한통운, 로젠택배 등)</li>
                <li>배송 지역: 전국 (도서산간 지역 제외)</li>
                <li>배송 기간: 결제 완료 후 2-3일 (영업일 기준)</li>
                <li>배송비: 3,000원 (50,000원 이상 구매 시 무료)</li>
              </ul>

              <h3 className="font-bold mt-4">배송 조회</h3>
              <p>주문하신 상품의 배송 상태는 다음과 같이 확인하실 수 있습니다:</p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>로그인 후 마이페이지로 이동합니다.</li>
                <li>'주문/배송 조회' 메뉴를 클릭합니다.</li>
                <li>해당 주문의 '배송조회' 버튼을 클릭하면 실시간 배송 위치를 확인할 수 있습니다.</li>
              </ol>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">교환/반품 안내</h2>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <h3 className="font-bold">교환/반품 가능 기간</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>상품 수령일로부터 7일 이내 신청 가능</li>
                <li>단순 변심의 경우 왕복 배송비(6,000원)가 발생합니다.</li>
                <li>상품 하자 또는 오배송의 경우 무료로 교환/반품 가능합니다.</li>
              </ul>

              <h3 className="font-bold mt-4">교환/반품 불가 사유</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>고객의 책임 있는 사유로 상품이 훼손된 경우</li>
                <li>포장을 개봉하였거나 포장이 훼손되어 상품가치가 상실된 경우</li>
                <li>고객의 사용 또는 일부 소비에 의하여 상품가치가 현저히 감소한 경우</li>
                <li>시간의 경과에 의하여 재판매가 곤란할 정도로 상품가치가 현저히 감소한 경우</li>
              </ul>

              <h3 className="font-bold mt-4">교환/반품 신청 방법</h3>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>고객센터(010-9999-9999)로 전화 또는 이메일(solution@gmail.com)로 신청</li>
                <li>마이페이지 {'>'} 주문내역 {'>'} 교환/반품 신청</li>
                <li>반품 상품 발송 (착불 발송 가능)</li>
                <li>상품 확인 후 환불 처리 (영업일 기준 3-5일)</li>
              </ol>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">고객센터</h2>
            <div className="bg-gray-50 p-6 rounded-lg space-y-2 text-sm">
              <p><strong>운영시간:</strong> 평일 09:00 - 18:00 (주말 및 공휴일 휴무)</p>
              <p><strong>전화:</strong> 010-9999-9999</p>
              <p><strong>이메일:</strong> solution@gmail.com</p>
              <p><strong>점심시간:</strong> 12:00 - 13:00</p>
              <p className="text-xs text-gray-600 mt-4">
                ※ 점심시간 및 업무 시간 외에는 게시판을 이용해주시면 순차적으로 답변드리겠습니다.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
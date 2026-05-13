import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    index = f.read()

s = '    <section style="background:#0A0A0A; overflow:hidden;" id="editor-section">'
e = '    <!-- 에디터 섹션 스크롤 애니메이션 -->'
si = index.find(s)
ei = index.find(e)

if si < 0 or ei < 0:
    print(f'ERROR: si={si}, ei={ei}')
    sys.exit(1)

new_section = """    <section style="background:#0A0A0A; overflow:hidden;" id="editor-section">
        <div style="max-width:680px; margin:0 auto; padding:64px 24px;">

            <!-- 상단 뱃지 -->
            <div style="text-align:center; margin-bottom:32px;">
                <span style="display:inline-flex; align-items:center; gap:6px; background:rgba(21,167,84,0.15); border:1px solid rgba(21,167,84,0.3); padding:6px 14px; border-radius:20px; font-size:12px; color:#15A754; font-weight:700;">
                    <span style="width:6px; height:6px; border-radius:50%; background:#15A754; display:block;"></span>
                    LIVE &nbsp; 첫 구매 고객 전원 혜택
                </span>
            </div>

            <!-- 헤드라인 -->
            <h2 style="text-align:center; font-size:clamp(2rem,5.5vw,3rem); font-weight:800; color:#fff; line-height:1.25; letter-spacing:-0.03em; margin:0 0 16px;">
                첫 구매 시,<br>블로그 솔루션<br><span style="color:#15A754;">1년권</span> 통째로 드립니다.
            </h2>
            <p style="text-align:center; font-size:14px; color:#555; margin:0 0 48px;">
                매달 결제 NO &middot; 추가 비용 NO &middot; <span style="color:#fff; font-weight:700;">365일</span> 풀 액세스.
            </p>

            <!-- 메인 카드 -->
            <div style="background:#111; border:1px solid #1E1E1E; border-radius:20px; overflow:hidden; margin-bottom:20px;">
                <div style="display:flex; flex-wrap:wrap;">
                    <!-- 왼쪽 -->
                    <div style="flex:1; min-width:260px; padding:28px 24px; border-right:1px solid #1E1E1E;">
                        <span style="display:inline-block; font-size:10px; font-weight:700; color:#15A754; border:1px solid #15A754; padding:3px 8px; border-radius:4px; margin-bottom:16px; letter-spacing:0.05em;">ONE-TIME OFFER</span>
                        <h3 style="font-size:22px; font-weight:800; color:#fff; margin:0 0 4px;">블로그 솔루션</h3>
                        <p style="font-size:28px; font-weight:800; color:#15A754; margin:0 0 20px;">1년 무료권</p>
                        <ul style="list-style:none; padding:0; margin:0; font-size:13px; color:#999; line-height:2.2;">
                            <li><span style="color:#15A754; margin-right:6px;">&#9679;</span> AI 블로그 에디터 무제한</li>
                            <li><span style="color:#15A754; margin-right:6px;">&#9679;</span> 잠재 고객 자동 수집 (하루 100명)</li>
                            <li><span style="color:#15A754; margin-right:6px;">&#9679;</span> SEO 상위 노출 자동화</li>
                            <li><span style="color:#15A754; margin-right:6px;">&#9679;</span> AI 이미지 생성 + 삽입</li>
                        </ul>
                    </div>
                    <!-- 오른쪽 -->
                    <div style="flex:1; min-width:240px; padding:28px 24px;">
                        <p style="font-size:12px; color:#555; margin:0 0 4px;">정가 <span style="text-decoration:line-through;">&yen;588,000</span> /년</p>
                        <div style="display:flex; align-items:baseline; gap:6px; margin-bottom:4px;">
                            <span style="font-size:clamp(2.5rem,6vw,3.5rem); font-weight:800; color:#fff; line-height:1;">&yen;0</span>
                            <span style="font-size:14px; color:#555;">/ 첫 해</span>
                        </div>
                        <p style="font-size:12px; color:#15A754; font-weight:700; margin:0 0 24px;">&minus;100% &middot; 약 49만원 절약</p>

                        <p style="font-size:12px; color:#555; margin:0 0 10px;">혜택 종료까지</p>
                        <div style="display:flex; gap:8px; margin-bottom:16px;">
                            <div style="background:#1A1A1A; border:1px solid #252525; border-radius:10px; padding:10px 0; flex:1; text-align:center;">
                                <p style="font-size:24px; font-weight:800; color:#fff; margin:0;">11</p>
                                <p style="font-size:10px; color:#555; margin:2px 0 0;">HRS</p>
                            </div>
                            <div style="color:#333; display:flex; align-items:center; font-size:20px; font-weight:700;">:</div>
                            <div style="background:#1A1A1A; border:1px solid #252525; border-radius:10px; padding:10px 0; flex:1; text-align:center;">
                                <p style="font-size:24px; font-weight:800; color:#fff; margin:0;">47</p>
                                <p style="font-size:10px; color:#555; margin:2px 0 0;">MIN</p>
                            </div>
                            <div style="color:#333; display:flex; align-items:center; font-size:20px; font-weight:700;">:</div>
                            <div style="background:#1A1A1A; border:1px solid #252525; border-radius:10px; padding:10px 0; flex:1; text-align:center;">
                                <p style="font-size:24px; font-weight:800; color:#fff; margin:0;">01</p>
                                <p style="font-size:10px; color:#555; margin:2px 0 0;">SEC</p>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; justify-content:space-between;">
                            <span style="font-size:12px; color:#555;">오늘 한정 좌석</span>
                            <span style="font-size:14px; font-weight:700; color:#15A754;">8 <span style="color:#555; font-weight:400;">/ 50석 남음</span></span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 하단 수치 3칸 -->
            <div style="display:flex; gap:10px; margin-bottom:32px;">
                <div style="flex:1; background:#111; border:1px solid #1E1E1E; border-radius:14px; padding:20px 12px; text-align:center;">
                    <p style="font-size:22px; font-weight:800; color:#fff; margin:0;">365 <span style="font-size:13px; color:#555;">일</span></p>
                    <p style="font-size:11px; color:#555; margin:6px 0 0;">하루 평균 &#8361;1,610 &rarr; <span style="color:#15A754; font-weight:700;">&#8361;0</span></p>
                    <p style="font-size:10px; color:#444; margin:2px 0 0;">고민할 필요 없음</p>
                </div>
                <div style="flex:1; background:#111; border:1px solid #1E1E1E; border-radius:14px; padding:20px 12px; text-align:center;">
                    <p style="font-size:22px; font-weight:800; color:#fff; margin:0;">42 <span style="font-size:13px; color:#555;">/ 50</span></p>
                    <p style="font-size:11px; color:#555; margin:6px 0 0;">오늘 가입자 수</p>
                    <p style="font-size:10px; color:#E53E3E; font-weight:700; margin:2px 0 0;">마감 임박</p>
                </div>
                <div style="flex:1; background:#111; border:1px solid #1E1E1E; border-radius:14px; padding:20px 12px; text-align:center;">
                    <p style="font-size:22px; font-weight:800; color:#fff; margin:0;">0 <span style="font-size:13px; color:#555;">원</span></p>
                    <p style="font-size:11px; color:#555; margin:6px 0 0;">첫 구매 한정</p>
                    <p style="font-size:10px; color:#444; margin:2px 0 0;">두 번째 결제는 정가</p>
                </div>
            </div>

            <!-- CTA -->
            <div style="text-align:center; margin-bottom:16px;">
                <button onclick="scrollToForm('free')" style="background:#15A754; color:#fff; font-weight:700; font-size:16px; padding:18px 48px; border-radius:14px; border:none; cursor:pointer; box-shadow:0 0 30px rgba(21,167,84,0.3);">
                    1년권 받고 시작하기 &rarr;
                </button>
            </div>
            <p style="text-align:center; font-size:12px; color:#444;">카드 등록 X &middot; 1분 결제 &middot; 미사용 시 100% 환불</p>

            <!-- 소셜 프루프 -->
            <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:24px;">
                <div style="display:flex;">
                    <span style="width:24px; height:24px; border-radius:50%; background:#15A754; border:2px solid #0A0A0A; display:block;"></span>
                    <span style="width:24px; height:24px; border-radius:50%; background:#EAB308; border:2px solid #0A0A0A; display:block; margin-left:-8px;"></span>
                    <span style="width:24px; height:24px; border-radius:50%; background:#3B82F6; border:2px solid #0A0A0A; display:block; margin-left:-8px;"></span>
                    <span style="width:24px; height:24px; border-radius:50%; background:#E53E3E; border:2px solid #0A0A0A; display:block; margin-left:-8px;"></span>
                </div>
                <p style="font-size:13px; color:#555; margin:0;"><span style="color:#15A754; font-weight:700;">2,847명</span>이 이미 1년권으로 시작했습니다</p>
            </div>

        </div>
    </section>

"""

new_index = index[:si] + new_section + index[ei:]
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_index)
print(f'Done: {len(new_index)//1024}KB')

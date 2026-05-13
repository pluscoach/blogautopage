import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    index = f.read()

s = '    <!-- ===== SECTION 3: HOW IT WORKS ===== -->'
e = '    <!-- ===== SECTION: AI 블로그 에디터'
si = index.find(s)
ei = index.find(e)

new_section = """    <!-- ===== SECTION 3: HOW IT WORKS ===== -->
    <section style="background:#F4F2EB; overflow:hidden;">
        <div style="max-width:680px; margin:0 auto; padding:64px 24px;">

            <!-- 헤더 -->
            <p style="text-align:center; font-size:13px; font-weight:700; color:#6E6E63; letter-spacing:0.15em; margin:0 0 12px;">HOW IT WORKS</p>
            <h2 style="text-align:center; font-size:clamp(1.8rem,5vw,2.8rem); font-weight:800; color:#14150F; line-height:1.25; letter-spacing:-0.03em; margin:0 0 56px;">
                AI가 <span style="color:#15A754;">진짜 이웃</span>을 찾는 방법
            </h2>

            <!-- STEP 1 -->
            <div style="margin-bottom:48px;">
                <div style="display:flex; align-items:center; gap:14px; margin-bottom:20px;">
                    <span style="background:#15A754; color:#fff; font-size:15px; font-weight:800; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">1</span>
                    <h3 style="font-size:clamp(1.2rem,3.5vw,1.6rem); font-weight:800; color:#14150F; margin:0;">내 블로그와 맞는 이웃만 골라냅니다</h3>
                </div>
                <p style="font-size:14px; color:#6E6E63; margin:0 0 16px; padding-left:50px;">247명 후보 중 적합도 필터링</p>
                <div style="display:flex; gap:12px; padding-left:50px; flex-wrap:wrap;">
                    <div style="flex:1; min-width:200px; background:#fff; border-radius:12px; padding:18px 20px; border:1px solid #E2DECE;">
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
                            <span style="font-size:15px; font-weight:700; color:#14150F;">뷰티블로거_뿌니</span>
                            <span style="font-size:12px; font-weight:700; color:#fff; background:#15A754; padding:4px 10px; border-radius:20px;">&#10003; 채택</span>
                        </div>
                        <div style="background:#E5F2EA; border-radius:6px; height:8px; overflow:hidden; margin-bottom:8px;">
                            <div style="background:#15A754; width:92%; height:100%; border-radius:6px;"></div>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span style="font-size:13px; color:#6E6E63;">소통 확률</span>
                            <span style="font-size:15px; font-weight:800; color:#15A754;">92%</span>
                        </div>
                    </div>
                    <div style="flex:1; min-width:200px; background:#fff; border-radius:12px; padding:18px 20px; border:1px solid #E2DECE;">
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
                            <span style="font-size:15px; font-weight:700; color:#14150F;">광고_제휴마케팅</span>
                            <span style="font-size:12px; font-weight:700; color:#E53E3E; background:#FEE2E2; padding:4px 10px; border-radius:20px;">제외</span>
                        </div>
                        <div style="background:#FEE2E2; border-radius:6px; height:8px; overflow:hidden; margin-bottom:8px;">
                            <div style="background:#E53E3E; width:12%; height:100%; border-radius:6px;"></div>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span style="font-size:13px; color:#6E6E63;">소통 확률</span>
                            <span style="font-size:15px; font-weight:800; color:#E53E3E;">12%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- STEP 2 -->
            <div style="margin-bottom:48px;">
                <div style="display:flex; align-items:center; gap:14px; margin-bottom:20px;">
                    <span style="background:#15A754; color:#fff; font-size:15px; font-weight:800; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">2</span>
                    <h3 style="font-size:clamp(1.2rem,3.5vw,1.6rem); font-weight:800; color:#14150F; margin:0;">맞춤 신청서를 보냅니다</h3>
                </div>
                <p style="font-size:14px; color:#6E6E63; margin:0 0 16px; padding-left:50px;">상대 블로그를 분석한 맞춤 메시지</p>
                <div style="background:#fff; border-radius:12px; padding:20px 24px; margin-left:50px; border:1px solid #E2DECE;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
                        <span style="width:22px; height:22px; border-radius:50%; background:#15A754; display:flex; align-items:center; justify-content:center;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                        <span style="font-size:14px; font-weight:700; color:#15A754;">서로이웃 신청 완료</span>
                    </div>
                    <p style="font-size:14px; color:#4A4B43; line-height:1.65; margin:0; padding-left:30px;">
                        "제주도 동 <span style="background:#E5F2EA; padding:1px 4px; border-radius:3px; font-weight:700; color:#15A754;">해안 코스</span> 글 정말 잘 봤어요. 저도 곧 제주 여행인데 참고하려고 이웃 신청드립니다 :)"
                    </p>
                </div>
            </div>

            <!-- STEP 3 -->
            <div style="margin-bottom:48px;">
                <div style="display:flex; align-items:center; gap:14px; margin-bottom:20px;">
                    <span style="background:#15A754; color:#fff; font-size:15px; font-weight:800; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">3</span>
                    <h3 style="font-size:clamp(1.2rem,3.5vw,1.6rem); font-weight:800; color:#14150F; margin:0;">게시글을 정독하고 댓글을 남깁니다</h3>
                </div>
                <p style="font-size:14px; color:#6E6E63; margin:0 0 16px; padding-left:50px;">글의 맥락을 파악한 정성 댓글</p>
                <div style="background:#fff; border-radius:12px; padding:20px 24px; margin-left:50px; border-left:3px solid #15A754;">
                    <p style="font-size:13px; color:#6E6E63; margin:0 0 12px;">『허리 통증 없이 6시간 앉아있는 법』에 남긴 댓글</p>
                    <p style="font-size:14px; color:#4A4B43; line-height:1.7; margin:0;">
                        "저도 거북목 때문에 모니터 높이 조정했는데, 받침대까지 쓰니까 확실히 달라지더라구요. 글 보고 바로 의자 쿠션도 바꿨습니다!"
                    </p>
                </div>
            </div>

            <!-- STEP 4 -->
            <div style="margin-bottom:48px;">
                <div style="display:flex; align-items:center; gap:14px; margin-bottom:20px;">
                    <span style="background:#15A754; color:#fff; font-size:15px; font-weight:800; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">4</span>
                    <h3 style="font-size:clamp(1.2rem,3.5vw,1.6rem); font-weight:800; color:#14150F; margin:0;">스팸&#183;유령 이웃은 자동으로 걸러냅니다</h3>
                </div>
                <p style="font-size:14px; color:#6E6E63; margin:0 0 16px; padding-left:50px;">오늘의 필터링 결과</p>
                <div style="display:flex; gap:12px; padding-left:50px; flex-wrap:wrap;">
                    <div style="flex:1; min-width:130px; background:#fff; border-radius:12px; padding:20px 16px; text-align:center; border:1px solid #E2DECE;">
                        <p style="font-size:clamp(1.5rem,4vw,2rem); font-weight:800; color:#14150F; margin:0;">31<span style="font-size:14px; font-weight:400; color:#6E6E63;">명</span></p>
                        <p style="font-size:13px; color:#6E6E63; margin:6px 0 0;">스팸 계정 차단</p>
                    </div>
                    <div style="flex:1; min-width:130px; background:#fff; border-radius:12px; padding:20px 16px; text-align:center; border:2px solid #15A754;">
                        <p style="font-size:clamp(1.5rem,4vw,2rem); font-weight:800; color:#15A754; margin:0;">100<span style="font-size:14px; font-weight:400; color:#6E6E63;">명</span></p>
                        <p style="font-size:13px; color:#15A754; font-weight:600; margin:6px 0 0;">진짜 이웃 확보</p>
                    </div>
                    <div style="flex:1; min-width:130px; background:#fff; border-radius:12px; padding:20px 16px; text-align:center; border:1px solid #E2DECE;">
                        <p style="font-size:clamp(1.5rem,4vw,2rem); font-weight:800; color:#14150F; margin:0;">1<span style="font-size:14px; font-weight:400; color:#6E6E63;">시간</span> 47<span style="font-size:14px; font-weight:400; color:#6E6E63;">분</span></p>
                        <p style="font-size:13px; color:#6E6E63; margin:6px 0 0;">총 소요 시간</p>
                    </div>
                </div>
            </div>

            <!-- CTA -->
            <div style="text-align:center;">
                <button onclick="scrollToForm('free')" style="background:#15A754; color:#fff; font-weight:700; font-size:16px; padding:16px 40px; border-radius:40px; border:none; cursor:pointer; box-shadow:0 14px 28px -12px rgba(21,167,84,0.5);">
                    7일 무료 체험 &#8212; 직접 확인해보기 &#8594;
                </button>
            </div>
        </div>
    </section>

"""

new_index = index[:si] + new_section + index[ei:]
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_index)
print(f'Done: {len(new_index)//1024}KB')

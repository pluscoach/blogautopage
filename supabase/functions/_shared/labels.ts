/**
 * 공통 라벨 매핑 유틸
 */

export function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    monthly: "1개월 이용",
    full_package: "2개월 이용",
    free_trial: "무료 체험",
    lifetime: "평생 이용",
  };
  return labels[plan] || plan;
}

export function getPayTypeLabel(payType: number): string {
  const labels: Record<number, string> = {
    1: "신용카드",
    6: "계좌이체",
    15: "카카오페이",
    16: "네이버페이",
    25: "토스페이",
  };
  return labels[payType] || "간편결제";
}

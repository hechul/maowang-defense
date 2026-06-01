/**
 * 개인정보 처리방침 — AIT 검수 요건 §운영
 * "개인정보 처리방침 링크가 있는가?" 통과
 */
import { ENABLE_MONETIZATION } from '../../config/mvpFlags';

export function PrivacyScreen({ onBack }: { onBack: () => void }) {
  return (
    <div style={styles.root}>
      <h1 style={styles.title}>개인정보 처리방침</h1>
      <div style={styles.scrollArea}>
        <h2 style={styles.h2}>1. 수집하는 개인정보 항목</h2>
        <p style={styles.p}>
          어둠의 군주는 게임 서비스 제공을 위해 다음 정보를 수집할 수 있습니다.
        </p>
        <ul style={styles.ul}>
          <li>토스 계정 식별자 (자동 수집, 게임 진행 저장 용도)</li>
          <li>닉네임 (선택, 리더보드 표시 용도)</li>
          <li>게임 플레이 기록 (웨이브 도달, 처치 수 등 — 통계 분석)</li>
        </ul>

        <h2 style={styles.h2}>2. 개인정보 이용 목적</h2>
        <p style={styles.p}>
          수집된 정보는 다음 목적으로만 이용됩니다.
        </p>
        <ul style={styles.ul}>
          <li>게임 서비스 제공 및 진행 상황 저장</li>
          <li>리더보드 및 랭킹 시스템 운영</li>
          {ENABLE_MONETIZATION && <li>광고 및 결제 서비스 제공</li>}
          <li>버그 수정 및 게임 품질 개선</li>
        </ul>

        <h2 style={styles.h2}>3. 개인정보 보유 기간</h2>
        <p style={styles.p}>
          수집된 정보는 서비스 이용 기간 동안 보유되며, 회원 탈퇴 시 즉시 삭제됩니다.
          단, 관련 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보관합니다.
        </p>

        <h2 style={styles.h2}>4. 개인정보 제3자 제공</h2>
        <p style={styles.p}>
          어둠의 군주는 이용자의 개인정보를 외부에 제공하지 않습니다.
          {ENABLE_MONETIZATION
            ? ' 광고 및 결제 처리는 토스 자체 시스템을 통해 이루어집니다.'
            : ' 현재 MVP에서는 광고 및 결제 처리가 비활성화되어 있습니다.'}
        </p>

        <h2 style={styles.h2}>5. 이용자 권리</h2>
        <p style={styles.p}>
          이용자는 언제든지 본인의 개인정보 열람, 정정, 삭제를 요청할 수 있으며,
          고객 문의를 통해 처리 가능합니다.
        </p>

        <h2 style={styles.h2}>6. 문의처</h2>
        <p style={styles.p}>
          개인정보 관련 문의는 고객 문의 페이지를 이용해 주세요.
        </p>

        <p style={styles.footer}>최종 업데이트: 2026-04-29</p>
      </div>
      <button style={styles.backBtn} onClick={onBack}>돌아가기</button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    padding: 18,
    background: 'rgba(5,3,15,0.97)',
    color: '#eaeaea',
  },
  title: {
    color: '#FFEAA7', fontSize: 20, marginBottom: 12,
    textAlign: 'center', letterSpacing: 2,
    textShadow: '2px 2px 0 #000',
  },
  scrollArea: {
    flex: 1, overflowY: 'auto',
    background: 'rgba(20,12,42,0.6)',
    border: '1px solid #4a3a6e',
    borderRadius: 6,
    padding: 14,
    fontSize: 12, lineHeight: 1.6,
  },
  h2: {
    color: '#FDCB6E', fontSize: 13, marginTop: 12, marginBottom: 6,
    fontWeight: 'bold',
  },
  p: { color: '#bbb', fontSize: 12, marginBottom: 6 },
  ul: { paddingLeft: 16, color: '#bbb', fontSize: 12 },
  footer: { color: '#666', fontSize: 11, marginTop: 16, textAlign: 'right' },
  backBtn: {
    marginTop: 12, padding: '10px 18px',
    background: 'linear-gradient(180deg,#D63031,#7a1818)',
    border: '2px solid #FDCB6E', borderRadius: 5,
    color: '#fff', fontWeight: 'bold', fontSize: 13,
    boxShadow: '0 3px 0 #4a0a0a',
  },
};

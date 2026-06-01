/**
 * 고객 문의 — AIT 검수 요건 §운영
 * "고객 문의 채널이 있는가?" 통과
 */
import { ENABLE_MONETIZATION } from '../../config/mvpFlags';

// 빌드 시 env로 교체 가능 (.env.production 에 VITE_SUPPORT_EMAIL=...)
const SUPPORT_EMAIL =
  (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) ||
  'support@card-dungeon.kr';
const SUPPORT_HOURS =
  (import.meta.env.VITE_SUPPORT_HOURS as string | undefined) ||
  '평일 오전 10시 ~ 오후 6시';

export function SupportScreen({ onBack }: { onBack: () => void }) {
  return (
    <div style={styles.root}>
      <h1 style={styles.title}>고객 문의</h1>
      <div style={styles.body}>
        <p style={styles.p}>
          어둠의 군주: 카드 던전을 즐겨주셔서 감사합니다.
          버그, 게임 관련 문의는 아래 채널로 연락해 주세요.
          {ENABLE_MONETIZATION ? ' 결제 문의도 함께 접수합니다.' : ''}
        </p>

        <div style={styles.card}>
          <div style={styles.label}>📧 문의 이메일</div>
          <a href={`mailto:${SUPPORT_EMAIL}?subject=%5B%EC%96%B4%EB%91%A0%EC%9D%98%20%EA%B5%B0%EC%A3%BC%5D%20%EB%AC%B8%EC%9D%98`} style={styles.email}>
            {SUPPORT_EMAIL}
          </a>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>⏰ 답변 시간</div>
          <p style={styles.note}>
            {SUPPORT_HOURS}<br />
            주말·공휴일 제외, 영업일 기준 1~2일 이내 답변
          </p>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>💡 자주 묻는 질문</div>
          <ul style={styles.ul}>
            {ENABLE_MONETIZATION && (
              <li><b>결제가 안 되어요</b> — 토스앱 결제 메뉴에서 처리 상태 확인 후 다시 시도해 주세요.</li>
            )}
            <li><b>게임이 끊겨요</b> — 토스앱을 완전히 종료한 후 재실행해 주세요.</li>
            <li><b>영혼석/유물이 사라졌어요</b> — 동일 토스 계정인지 확인해 주세요.</li>
          </ul>
        </div>

        <p style={styles.footer}>
          버그 제보 시 다음 정보를 함께 보내주시면 빠른 해결에 도움이 됩니다:<br />
          기기 모델명 / OS 버전 / 발생 시점 / 재현 방법
        </p>
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
  body: {
    flex: 1, overflowY: 'auto',
    fontSize: 13, lineHeight: 1.6,
  },
  p: { color: '#eaeaea', marginBottom: 14, fontSize: 13 },
  card: {
    background: 'rgba(20,12,42,0.7)',
    border: '1px solid #4a3a6e',
    borderRadius: 6,
    padding: 12, marginBottom: 10,
  },
  label: { color: '#FDCB6E', fontSize: 12, fontWeight: 'bold', marginBottom: 6, letterSpacing: 1 },
  email: { color: '#FFEAA7', fontSize: 14, fontWeight: 'bold' },
  note: { color: '#bbb', fontSize: 12 },
  ul: { paddingLeft: 16, color: '#bbb', fontSize: 12 },
  footer: { color: '#888', fontSize: 11, marginTop: 14, lineHeight: 1.7 },
  backBtn: {
    marginTop: 12, padding: '10px 18px',
    background: 'linear-gradient(180deg,#D63031,#7a1818)',
    border: '2px solid #FDCB6E', borderRadius: 5,
    color: '#fff', fontWeight: 'bold', fontSize: 13,
    boxShadow: '0 3px 0 #4a0a0a',
  },
};

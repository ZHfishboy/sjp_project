import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../services/api';
import { isLoggedIn } from '../services/auth';

interface Props { onClose: () => void; onStay: () => void; }

export default function ExitIntentModal({ onClose, onStay }: Props) {
  const nav = useNavigate();
  const [copy, setCopy] = useState({ copyId: '', copyText: '', showRechargeCTA: false });
  const [clicks, setClicks] = useState(0);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    get('/exit-intent/copy').then((d: any) => setCopy(d.data || {}))
      .catch(() => setCopy({ copyId: 'fallback', copyText: '求求你了主人，你真的要退出吗？', showRechargeCTA: !isLoggedIn() }));
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleClose = () => {
    if (countdown > 0) return;
    setClicks(c => c + 1);
    if (clicks >= 1) {
      post('/exit-intent/log', { copyId: copy.copyId, copyText: copy.copyText, userAction: 0 }).catch(() => {});
      onClose();
    }
  };

  const handleStay = () => {
    post('/exit-intent/log', { copyId: copy.copyId, copyText: copy.copyText, userAction: 1 }).catch(() => {});
    onStay();
  };

  const handleRecharge = () => {
    post('/exit-intent/log', { copyId: copy.copyId, copyText: copy.copyText, userAction: 2 }).catch(() => {});
    onClose(); nav('/vip');
  };

  return (
    <div className="tb-modal-overlay" onClick={handleClose}>
      <div className="tb-modal anim-shake" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🥺</div>
        <h2>{copy.copyText}</h2>
        <p>再陪我算一道题吧～</p>

        {countdown > 0 && (
          <div style={{ background: 'linear-gradient(135deg, #FF5000, #FF9100)', color: '#fff', padding: '6px 16px', borderRadius: 20, display: 'inline-block', fontSize: 13, fontWeight: 700, marginBottom: 12, animation: 'pulse 1s ease-in-out infinite' }}>
            倒计时 {countdown}s 后可关闭
          </div>
        )}

        {copy.showRechargeCTA && (
          <div style={{ background: 'linear-gradient(135deg, #FFF8F3, #FFECD2)', borderRadius: 12, padding: '14px', marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--tb-orange)', marginBottom: 4 }}>首冲 ¥1 立享 ⚡ 闪电模式</div>
            <div style={{ fontSize: 12, color: '#B85C00' }}>告别龟速，秒出结果！</div>
            <button className="tb-btn tb-btn-primary tb-btn-sm" onClick={handleRecharge} style={{ marginTop: 10 }}>去充值</button>
          </div>
        )}

        <div className="tb-modal-btns">
          <button className="tb-btn tb-btn-outline" onClick={handleClose}
            style={{ opacity: countdown > 0 ? 0.4 : 1, cursor: countdown > 0 ? 'not-allowed' : 'pointer' }}>
            {countdown > 0 ? `${countdown}s` : clicks === 0 ? '狠心离开' : '真的要离开吗...'}
          </button>
          <button className="tb-btn tb-btn-primary" onClick={handleStay}>再算一道题</button>
        </div>
      </div>
    </div>
  );
}

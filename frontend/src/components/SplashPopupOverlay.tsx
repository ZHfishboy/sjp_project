import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../services/api';

interface Props { onDone: () => void; }

interface PopupData {
  index: number; type: string; title: string; subtitle: string;
  ctaText: string; ctaLink: string; closable: boolean;
  threeClickCopy?: string[]; threeClickButtons?: string[];
}

const typeIcons: Record<string, string> = {
  welcome: '👋', first_purchase: '⚡', invite: '🎁', vip_promo: '🔥', ultimate: '🎉',
};

export default function SplashPopupOverlay({ onDone }: Props) {
  const nav = useNavigate();
  const [popups, setPopups] = useState<PopupData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showClose, setShowClose] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const sessionId = useRef(Math.random().toString(36).slice(2)).current;

  useEffect(() => {
    get('/splash-popup/list').then((d: any) => {
      const list = d.data?.popups || [];
      setPopups(list);
      if (list.length === 0) onDone();
    }).catch(() => onDone());
  }, []);

  useEffect(() => {
    if (popups.length === 0) return;
    setCountdown(5);
    setShowClose(false);
    const timer = setTimeout(() => setShowClose(true), 5000);
    const tick = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => { clearTimeout(timer); clearInterval(tick); };
  }, [currentIndex, popups.length]);

  const log = useCallback((action: number) => {
    const p = popups[currentIndex];
    if (!p) return;
    post('/splash-popup/log', { sessionId, popupIndex: p.index, popupType: p.type, action }).catch(() => {});
  }, [currentIndex, popups, sessionId]);

  useEffect(() => {
    if (popups.length > 0 && popups[currentIndex]) log(1);
  }, [currentIndex, popups]);

  const goNext = () => {
    if (currentIndex + 1 >= popups.length) { onDone(); return; }
    setCurrentIndex(i => i + 1);
    setShowClose(false);
    setClickCount(0);
  };

  const p = popups[currentIndex];
  if (!p) return null;

  const isLast = p.index === 5;

  const handleClose = () => {
    if (!p.closable && isLast) {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      if (newCount === 1) { setShaking(true); setTimeout(() => setShaking(false), 300); log(5); }
      else if (newCount === 2) { setBouncing(true); setTimeout(() => setBouncing(false), 300); log(6); }
      else { log(7); nav('/vip'); return; }
    } else { log(2); goNext(); }
  };

  const handleSkip = () => { log(3); onDone(); };
  const handleCTA = () => { log(4); nav(p.ctaLink || '/vip'); };

  return (
    <div className="tb-modal-overlay">
      <div className={`tb-modal ${shaking ? 'anim-shake' : ''} ${bouncing ? 'anim-shake' : ''}`} style={{ maxWidth: 340 }}>
        {!showClose && countdown > 0 && (
          <div style={{ background: 'linear-gradient(135deg, #FF5000, #FF9100)', color: '#fff', padding: '4px 14px', borderRadius: 16, display: 'inline-block', fontSize: 12, fontWeight: 700, marginBottom: 8, animation: 'pulse 1s ease-in-out infinite' }}>
            {countdown}s 后可关闭
          </div>
        )}
        {showClose && (
          <div style={{ textAlign: 'right', marginBottom: 0 }}>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#BBB', lineHeight: 1 }}>
              ✕
            </button>
            {isLast && clickCount > 0 && (
              <div style={{ fontSize: 11, color: 'var(--tb-orange)', marginTop: -2 }}>
                {p.threeClickCopy?.[Math.min(clickCount - 1, 1)]}
              </div>
            )}
          </div>
        )}

        <div style={{ fontSize: 52, marginBottom: 8 }}>{typeIcons[p.type] || '🎉'}</div>
        <h2 style={{ fontSize: 18 }}>{p.title}</h2>
        <p style={{ fontSize: 13 }}>{p.subtitle}</p>

        <button className="tb-btn tb-btn-primary" onClick={handleCTA} style={{ marginTop: 8, fontSize: 15 }}>
          {p.ctaText}
        </button>

        {/* Progress dots */}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 8 }}>
          {popups.map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: 4,
              background: i === currentIndex ? 'var(--tb-orange)' : '#E0E0E0',
              transition: 'all 0.3s',
              transform: i === currentIndex ? 'scale(1.3)' : 'scale(1)',
            }} />
          ))}
        </div>

        {p.index !== 5 && (
          <button onClick={handleSkip} style={{ marginTop: 14, background: 'none', border: 'none', color: '#BBB', fontSize: 12, cursor: 'pointer' }}>
            跳过 ▸
          </button>
        )}

        {isLast && clickCount > 0 && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--tb-red)' }}>
            已点击 {clickCount}/3 次
          </div>
        )}
      </div>
    </div>
  );
}

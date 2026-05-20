import React, { useState, useEffect } from 'react';
import { post } from '../services/api';

interface Props { onClose: () => void; }

const GIFT_PACKS = [
  { id: 'starter', name: '入门礼包', tokens: 50, vipDays: 3, price: 1, original: 9, discount: '1.1折', color: '#FF9100' },
  { id: 'value', name: '超值礼包', tokens: 300, vipDays: 30, price: 12, original: 30, discount: '4折', color: '#FF5000', rec: true },
  { id: 'premium', name: '至尊礼包', tokens: 1200, vipDays: 90, price: 48, original: 79, discount: '6折', color: '#E04800' },
];

export default function GiftPackModal({ onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const buyGift = async (packId: string) => {
    setLoading(true);
    try {
      await post('/gift/first-purchase/shown');
      const d: any = await post('/vip/order', { type: 'gift', planId: packId });
      alert('购买成功！' + (d.data?.payment?.tokensAdded ? `获得 ${d.data.payment.tokensAdded} 计算币` : ''));
      onClose();
    } catch (err: any) { alert(err.response?.data?.message || '购买失败'); }
    setLoading(false);
  };

  const handleReject = async () => {
    await post('/gift/first-purchase/dismiss').catch(() => {});
    onClose();
  };

  return (
    <div className="tb-modal-overlay">
      <div className="tb-modal" style={{ maxWidth: 380 }}>
        <div style={{ fontSize: 44, marginBottom: 4 }}>🎉</div>
        <h2>首冲大礼包</h2>
        <p style={{ fontSize: 13 }}>感谢加入！专属新人的超级福利</p>
        <p style={{ fontSize: 11, color: 'var(--tb-red)' }}>⚠ 仅此一次，关闭后不再展示</p>

        {/* Countdown badge */}
        {countdown > 0 && (
          <div style={{ background: 'linear-gradient(135deg, #FF5000, #FF9100)', color: '#fff', padding: '6px 16px', borderRadius: 20, display: 'inline-block', fontSize: 13, fontWeight: 700, marginTop: 8, animation: 'pulse 1s ease-in-out infinite' }}>
            倒计时 {countdown}s 后可关闭
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          {GIFT_PACKS.map(pack => (
            <button key={pack.id} onClick={() => countdown === 0 && buyGift(pack.id)} disabled={loading || countdown > 0}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', border: `2px solid ${pack.rec ? 'var(--tb-orange)' : 'var(--tb-border)'}`,
                borderRadius: 12, background: '#fff', cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                position: 'relative', opacity: countdown > 0 ? 0.5 : 1, transition: 'all 0.3s',
              }}>
              {pack.rec && (
                <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--tb-red)', color: '#fff', padding: '3px 14px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                  推荐
                </span>
              )}
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: pack.color }}>{pack.name}</div>
                <div style={{ fontSize: 11, color: 'var(--tb-text-secondary)', marginTop: 2 }}>
                  {pack.tokens}币 + {pack.vipDays}天VIP
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 900, fontSize: 22, color: 'var(--tb-orange)' }}>¥{pack.price}</div>
                <div style={{ fontSize: 11 }}>
                  <span style={{ textDecoration: 'line-through', color: 'var(--tb-text-muted)' }}>¥{pack.original}</span>
                  <span style={{ color: 'var(--tb-red)', marginLeft: 4, fontWeight: 600 }}>{pack.discount}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button className="tb-btn tb-btn-primary" onClick={() => countdown === 0 && buyGift('value')} disabled={loading || countdown > 0}
          style={{ marginTop: 14, fontSize: 15, opacity: countdown > 0 ? 0.4 : 1 }}>
          {countdown > 0 ? `请等待 ${countdown}s` : '立即抢购（推荐超值礼包）'}
        </button>
        {countdown === 0 && (
          <button onClick={handleReject}
            style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--tb-text-muted)', fontSize: 12, cursor: 'pointer' }}>
            残忍拒绝，原价购买
          </button>
        )}
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--tb-gold)' }}>
          ⏱ 24小时后恢复原价
        </div>
      </div>
    </div>
  );
}

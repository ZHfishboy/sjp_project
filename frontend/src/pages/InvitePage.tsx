import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../services/api';
import { isLoggedIn } from '../services/auth';
import PageHeader from '../components/PageHeader';

export default function InvitePage() {
  const nav = useNavigate();
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    if (!isLoggedIn()) { nav('/login'); return; }
    get('/invite/my-code').then((d: any) => setInfo(d.data)).catch(() => {});
  }, []);

  if (!info) return (
    <div style={{ maxWidth: 500, margin: '0 auto', minHeight: '100vh', background: 'var(--tb-bg)' }}>
      <PageHeader title="邀请好友" showBack />
      <div className="tb-page">加载中...</div>
    </div>
  );

  const copyInviteCode = () => {
    navigator.clipboard.writeText(info.shareText || info.inviteCode);
    alert('已复制邀请文案！');
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', minHeight: '100vh', background: 'var(--tb-bg)' }}>
      <PageHeader title="邀请好友" showBack />
      <div className="tb-page anim-slide-up">
        {/* Invite Code */}
        <div className="tb-card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #FFF8F3, #FFECD2)' }}>
          <div style={{ fontSize: 13, color: 'var(--tb-text-secondary)', marginBottom: 4 }}>我的邀请码</div>
          <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: 6, color: 'var(--tb-orange)', fontFamily: 'SF Mono, Menlo, monospace' }}>
            {info.inviteCode}
          </div>
          <button className="tb-btn tb-btn-primary tb-btn-sm" onClick={copyInviteCode} style={{ marginTop: 12 }}>
            复制邀请文案
          </button>
          <div style={{ fontSize: 12, color: 'var(--tb-text-secondary)', marginTop: 8 }}>
            已成功邀请 <span style={{ fontWeight: 700, color: 'var(--tb-orange)' }}>{info.inviteeCount}</span> 人
          </div>
        </div>

        {/* Milestones */}
        <div className="tb-card">
          <div className="tb-card-title">🏆 邀请里程碑</div>
          {(info.milestones || []).map((m: any, i: number) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0', borderBottom: i < info.milestones.length - 1 ? '1px solid var(--tb-border)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 18,
                  background: m.earned ? 'linear-gradient(135deg, var(--tb-orange), var(--tb-gold))' : '#F0F0F0',
                  color: m.earned ? '#fff' : '#BBB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800,
                }}>
                  {m.earned ? '✓' : m.count}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>邀请 {m.count} 人</div>
                  <div style={{ fontSize: 12, color: 'var(--tb-text-secondary)' }}>{m.reward}</div>
                </div>
              </div>
              <span className={`tb-tag ${m.earned ? 'tb-tag-green' : 'tb-tag-gray'}`}>
                {m.earned ? '已达成' : '未达成'}
              </span>
            </div>
          ))}
        </div>

        {/* Rules */}
        <div className="tb-card" style={{ background: '#FAFAFA' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📋 奖励规则</div>
          <div style={{ fontSize: 13, color: 'var(--tb-text-secondary)', lineHeight: 2 }}>
            <div>· 好友注册 → 你获得 <span style={{ fontWeight: 600, color: 'var(--tb-orange)' }}>10 计算币</span></div>
            <div>· 好友首充 → 你获得充值金额 <span style={{ fontWeight: 600, color: 'var(--tb-orange)' }}>20%</span> 等值计算币</div>
            <div>· 好友累计充值 ≥ ¥100 → 额外获得 <span style={{ fontWeight: 600, color: 'var(--tb-orange)' }}>100 计算币</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

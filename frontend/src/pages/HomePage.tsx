import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Calculator from '../components/Calculator';
import ExchangeConverter from '../components/ExchangeConverter';
import UnitConverter from '../components/UnitConverter';
import SpeedTierBar from '../components/SpeedTierBar';
import ExitIntentModal from '../components/ExitIntentModal';
import SplashPopupOverlay from '../components/SplashPopupOverlay';
import GiftPackModal from '../components/GiftPackModal';
import { isLoggedIn } from '../services/auth';
import { get } from '../services/api';

type Tab = 'calc' | 'exchange' | 'unit' | 'history';

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'calc', label: '计算', icon: '±' },
  { key: 'exchange', label: '汇率', icon: '¥' },
  { key: 'unit', label: '单位', icon: '⇄' },
  { key: 'history', label: '历史', icon: '◷' },
];

export default function HomePage() {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('calc');
  const [tier, setTier] = useState<number>(3);
  const [totalRecharge, setTotalRecharge] = useState(0);
  const [isVip, setIsVip] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showGift, setShowGift] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyKey, setHistoryKey] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      loadUserStatus();
      checkGiftEligibility();
    }
    const hasSeenSplash = sessionStorage.getItem('splash_seen');
    if (!hasSeenSplash) {
      setShowSplash(true);
      sessionStorage.setItem('splash_seen', '1');
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    let lastShown = 0;
    const handler = (e: MouseEvent) => {
      if (e.clientY <= 0 && Date.now() - lastShown > 86400000) {
        lastShown = Date.now();
        setShowExit(true);
      }
    };
    document.addEventListener('mouseleave', handler);
    return () => document.removeEventListener('mouseleave', handler);
  }, []);

  const loadUserStatus = async () => {
    try {
      const data: any = await get('/vip/status');
      const status = data.data;
      setTier(status.speedTier?.tier || 3);
      setTotalRecharge(status.totalRecharge || 0);
      setIsVip(!!status.vip);
    } catch {}
  };

  const checkGiftEligibility = async () => {
    try {
      const data: any = await get('/gift/first-purchase');
      if (data.data?.eligible) setShowGift(true);
    } catch {}
  };

  const loadHistory = async () => {
    if (!isLoggedIn()) return;
    try {
      const data: any = await get('/calc/history?pageSize=20');
      setHistory(data.data?.list || []);
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab, historyKey]);

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', minHeight: '100vh', background: 'var(--tb-bg)', position: 'relative' }}>
      {/* Top Header */}
      <div className="tb-header">
        <div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>全能计算工具</div>
          <div className="tb-header-title">高级效率计算器<span style={{fontSize:11,fontWeight:400,opacity:0.7,marginLeft:4}}>免费版</span></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isLoggedIn() ? (
            <button onClick={() => nav('/profile')} className="tb-header-btn">我的</button>
          ) : (
            <button onClick={() => nav('/login')} className="tb-header-btn">登录</button>
          )}
        </div>
      </div>

      {/* Speed Tier Bar */}
      {isLoggedIn() && (
        <SpeedTierBar tier={tier} totalRecharge={totalRecharge} onUpgrade={() => nav('/vip')} />
      )}

      {/* Tab Content */}
      <div style={{ paddingBottom: 70, minHeight: 'calc(100vh - 120px)' }}>
        {activeTab === 'calc' && (
          <div className="anim-slide-up">
            <Calculator isVip={isVip} onHistoryRefresh={() => setHistoryKey(k => k + 1)} />
          </div>
        )}
        {activeTab === 'exchange' && (
          <div className="tb-page anim-slide-up"><ExchangeConverter /></div>
        )}
        {activeTab === 'unit' && (
          <div className="tb-page anim-slide-up"><UnitConverter /></div>
        )}
        {activeTab === 'history' && (
          <div className="tb-page anim-slide-up">
            <div className="tb-card-title" style={{ fontSize: 18 }}>计算历史</div>
            {!isLoggedIn() ? (
              <div className="tb-empty">
                <div className="tb-empty-icon">📋</div>
                <p style={{ marginBottom: 16 }}>登录后可查看计算历史</p>
                <button className="tb-btn tb-btn-primary tb-btn-sm" onClick={() => nav('/login')}>去登录</button>
              </div>
            ) : history.length === 0 ? (
              <div className="tb-empty">
                <div className="tb-empty-icon">📝</div>
                <p>暂无计算记录</p>
              </div>
            ) : (
              history.map((h: any, i: number) => (
                <div key={h.id} className="tb-card anim-slide-up" style={{ animationDelay: `${i * 0.03}s` }}>
                  <div style={{ fontFamily: 'SF Mono, Menlo, monospace', color: 'var(--tb-text-secondary)', fontSize: 14 }}>{h.expression}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>= {h.result}</div>
                  <div style={{ fontSize: 11, color: 'var(--tb-text-muted)', marginTop: 6, display: 'flex', gap: 12 }}>
                    <span>{new Date(h.created_at).toLocaleString()}</span>
                    <span className={`tb-tag ${h.tokens_spent > 0 ? 'tb-tag-orange' : 'tb-tag-green'}`}>
                      {h.tokens_spent > 0 ? `-${h.tokens_spent}币` : '免费'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div className="tb-tabbar">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`tb-tab-item ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <span className="tb-tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
        <button
          className={`tb-tab-item`}
          onClick={() => nav(isLoggedIn() ? '/vip' : '/login')}
        >
          <span className="tb-tab-icon">👑</span>
          <span>VIP</span>
        </button>
      </div>

      {/* Modals */}
      {showExit && <ExitIntentModal onClose={() => setShowExit(false)} onStay={() => setShowExit(false)} />}
      {showSplash && <SplashPopupOverlay onDone={() => setShowSplash(false)} />}
      {showGift && <GiftPackModal onClose={() => setShowGift(false)} />}
    </div>
  );
}

import React from 'react';

interface Props {
  tier: number;
  totalRecharge: number;
  onUpgrade: () => void;
}

export default function SpeedTierBar({ tier, totalRecharge, onUpgrade }: Props) {
  const config = tier === 1
    ? { emoji: '⚡', name: '闪电模式', color: 't1', next: null, delay: '0ms' }
    : tier === 2
    ? { emoji: '🚗', name: '正常模式', color: 't2', next: { emoji: '⚡', need: 200 - totalRecharge }, delay: '200ms' }
    : { emoji: '🐢', name: '乌龟模式', color: 't3', next: { emoji: '🚗', need: 50 - totalRecharge }, delay: '3000ms' };

  const progress = tier === 3 ? Math.min(100, (totalRecharge / 50) * 100)
    : tier === 2 ? Math.min(100, ((totalRecharge - 50) / 150) * 100) : 100;

  return (
    <div className={`tier-bar ${config.color}`} onClick={onUpgrade}>
      <span>{config.emoji}</span>
      <span style={{ minWidth: 60, fontSize: 12 }}>{config.name}</span>
      <div className="tier-progress">
        <div className="tier-progress-inner" style={{ width: `${progress}%` }} />
      </div>
      <span style={{ fontSize: 11, minWidth: 36, textAlign: 'right' }}>{config.delay}</span>
      {config.next && (
        <span style={{ fontSize: 10, opacity: 0.8 }}>
          ▸ {config.next.emoji} ¥{config.next.need}
        </span>
      )}
    </div>
  );
}

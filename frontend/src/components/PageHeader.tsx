import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  title: string;
  showBack?: boolean;
  rightAction?: { label: string; onClick: () => void };
}

export default function PageHeader({ title, showBack, rightAction }: Props) {
  const nav = useNavigate();
  return (
    <div className="tb-header">
      <div style={{ width: 60 }}>
        {showBack && (
          <button
            onClick={() => nav(-1)}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
              padding: '5px 12px', borderRadius: 16, fontSize: 13, cursor: 'pointer',
              backdropFilter: 'blur(4px)', fontWeight: 500,
            }}
          >
            ← 返回
          </button>
        )}
      </div>
      <div className="tb-header-title">{title}</div>
      <div style={{ width: 60, textAlign: 'right' }}>
        {rightAction && (
          <button
            onClick={rightAction.onClick}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
              padding: '5px 12px', borderRadius: 16, fontSize: 13, cursor: 'pointer',
              backdropFilter: 'blur(4px)', fontWeight: 500,
            }}
          >
            {rightAction.label}
          </button>
        )}
      </div>
    </div>
  );
}

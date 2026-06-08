import { useRef, useEffect, useState } from 'react';

interface RaisePopupProps {
  minRaise: number;
  maxTotalBet: number;
  halfPotTotalBet: number;
  potTotalBet: number;
  onConfirm: (amount: number) => void;
  onClose: () => void;
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 6,
  WebkitAppearance: 'none',
  appearance: 'none',
  background: '#3a3a5a',
  borderRadius: 3,
  outline: 'none',
  cursor: 'pointer',
};

function quickBetButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 14px',
    borderRadius: 6,
    border: active ? '2px solid #f39c12' : '1px solid #555',
    background: active ? 'rgba(243, 156, 18, 0.2)' : 'transparent',
    color: active ? '#f39c12' : '#bbb',
    fontSize: 13,
    fontWeight: active ? 'bold' : 'normal',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  };
}

export function RaisePopup({ minRaise, maxTotalBet, halfPotTotalBet, potTotalBet, onConfirm, onClose }: RaisePopupProps) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={popupRef}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: 10,
        background: 'rgba(30, 30, 50, 0.97)',
        border: '2px solid #f39c12',
        borderRadius: 12,
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minWidth: 280,
        boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
        zIndex: 200,
      }}
    >
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        <button
          onClick={() => setRaiseAmount(halfPotTotalBet)}
          style={quickBetButtonStyle(raiseAmount === halfPotTotalBet)}
        >
          1/2底池
        </button>
        <button
          onClick={() => setRaiseAmount(potTotalBet)}
          style={quickBetButtonStyle(raiseAmount === potTotalBet)}
        >
          底池
        </button>
        <button
          onClick={() => setRaiseAmount(maxTotalBet)}
          style={quickBetButtonStyle(raiseAmount === maxTotalBet)}
        >
          全押
        </button>
      </div>

      <input
        type="range"
        min={minRaise}
        max={maxTotalBet}
        step={10}
        value={raiseAmount}
        onChange={(e) => setRaiseAmount(Number(e.target.value))}
        style={sliderStyle}
      />

      <div
        style={{
          textAlign: 'center',
          color: '#f39c12',
          fontSize: 20,
          fontWeight: 'bold',
        }}
      >
        加注至 {raiseAmount}
      </div>

      <button
        onClick={() => {
          onConfirm(raiseAmount);
          setRaiseAmount(minRaise);
        }}
        style={{
          padding: '10px 0',
          borderRadius: 8,
          border: 'none',
          background: 'linear-gradient(135deg, #f39c12, #e67e22)',
          color: 'white',
          fontSize: 16,
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 3px 10px rgba(243, 156, 18, 0.4)',
        }}
      >
        确认加注
      </button>
    </div>
  );
}

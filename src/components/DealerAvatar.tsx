export function DealerAvatar({ isDealing }: { isDealing: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '5%',
        transform: 'translateX(-50%)',
        width: 72,
        height: 96,
        zIndex: 2,
        animation: isDealing ? 'dealerDeal 0.5s ease-in-out infinite alternate' : 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: '#d9b081',
          boxShadow: 'inset 0 5px 0 rgba(121, 77, 37, 0.55)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 33,
          left: 12,
          width: 48,
          height: 58,
          borderRadius: '18px 18px 8px 8px',
          background: 'linear-gradient(90deg, #2c353b 0 24%, #f6f0e8 24% 76%, #2c353b 76% 100%)',
          boxShadow: '0 10px 16px rgba(0,0,0,0.18)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 46,
          left: 31,
          width: 10,
          height: 10,
          borderRadius: 2,
          background: '#c84a44',
          transform: 'rotate(45deg)',
        }}
      />
    </div>
  );
}

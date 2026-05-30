import { useState } from 'react';
import { Difficulty } from '../engine/types';
import { useGameStore } from '../store/gameStore';

export function GameSetup() {
  const startGame = useGameStore((s) => s.startGame);
  const [playerCount, setPlayerCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Medium);
  const [startingChips, setStartingChips] = useState(1000);
  const [playerName, setPlayerName] = useState('Master');

  const handleStart = () => {
    startGame({ playerCount, difficulty, startingChips, playerName: playerName.trim() || '玩家' });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'radial-gradient(circle at center, #1a2a3a 0%, #0d1b2a 100%)',
        padding: 20,
        animation: 'fadeIn 0.5s ease',
      }}
    >
      <h1
        style={{
          fontSize: 42,
          fontWeight: 'bold',
          color: '#f39c12',
          marginBottom: 8,
          textShadow: '0 0 20px rgba(243, 156, 18, 0.5)',
        }}
      >
        Texas Hold'em
      </h1>
      <p style={{ color: '#95a5a6', marginBottom: 40, fontSize: 16 }}>
        单机版德州扑克
      </p>

      <div
        style={{
          background: 'rgba(30, 40, 60, 0.9)',
          padding: '30px 40px',
          borderRadius: 16,
          width: '100%',
          maxWidth: 400,
          border: '1px solid #2c3e50',
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', color: '#bdc3c7', marginBottom: 8, fontSize: 14, fontWeight: 'bold' }}>
            玩家名称
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="输入你的昵称（可选）"
            maxLength={12}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '2px solid #333',
              background: '#1a1a2e',
              color: '#f39c12',
              fontSize: 16,
              fontWeight: 'bold',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', color: '#bdc3c7', marginBottom: 8, fontSize: 14, fontWeight: 'bold' }}>
            玩家人数
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[2, 3, 4, 5, 6].map((count) => (
              <button
                key={count}
                onClick={() => setPlayerCount(count)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 8,
                  border: playerCount === count ? '2px solid #f39c12' : '2px solid #333',
                  background: playerCount === count ? 'rgba(243, 156, 18, 0.2)' : '#2c3e50',
                  color: playerCount === count ? '#f39c12' : '#bdc3c7',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', color: '#bdc3c7', marginBottom: 8, fontSize: 14, fontWeight: 'bold' }}>
            AI 难度
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { value: Difficulty.Easy, label: '简单', desc: '基础策略，随机决策' },
              { value: Difficulty.Medium, label: '中等', desc: '考虑手牌强度和底池赔率' },
              { value: Difficulty.Hard, label: '困难', desc: '高级策略，蒙特卡洛模拟' },
            ].map((d) => (
              <button
                key={d.value}
                onClick={() => setDifficulty(d.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: difficulty === d.value ? '2px solid #f39c12' : '2px solid #333',
                  background: difficulty === d.value ? 'rgba(243, 156, 18, 0.2)' : '#2c3e50',
                  color: difficulty === d.value ? '#f39c12' : '#bdc3c7',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  width: '100%',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{d.label}</div>
                <div style={{ fontSize: 12, color: '#95a5a6' }}>{d.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 30 }}>
          <label style={{ display: 'block', color: '#bdc3c7', marginBottom: 8, fontSize: 14, fontWeight: 'bold' }}>
            初始筹码
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[500, 1000, 2000, 5000].map((chips) => (
              <button
                key={chips}
                onClick={() => setStartingChips(chips)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 8,
                  border: startingChips === chips ? '2px solid #f39c12' : '2px solid #333',
                  background: startingChips === chips ? 'rgba(243, 156, 18, 0.2)' : '#2c3e50',
                  color: startingChips === chips ? '#f39c12' : '#bdc3c7',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {chips}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 10,
            border: 'none',
            background: '#f39c12',
            color: 'white',
            fontSize: 18,
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 15px rgba(243, 156, 18, 0.4)',
          }}
        >
          开始游戏
        </button>
      </div>
    </div>
  );
}

import { GameSetup } from './components/GameSetup';
import { GameTable } from './components/GameTable';
import { useGameStore } from './store/gameStore';

function App() {
  const state = useGameStore((s) => s.state);

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      {state ? <GameTable /> : <GameSetup />}
    </div>
  );
}

export default App;

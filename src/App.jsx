import Sidebar from './components/Sidebar';
import CoinsPage from './views/CoinsPage';
import { useCoinStore } from './store/useCoinStore';

const App = () => {
  const { currentView } = useCoinStore();

  const renderView = () => {
    switch (currentView) {
      case 'coins':
        return <CoinsPage />;
      default:
        return (
          <div className="flex-1 flex items-center justify-center text-neutral-500">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2 uppercase">{currentView}</h2>
              <p>This module is coming soon in Phase 2.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderView()}
      </main>
    </div>
  );
};

export default App;

import { Search, Bell, User } from 'lucide-react';

const TopBar = () => {
  return (
    <header className="h-16 border-b border-dark-accent bg-dark-lighter/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4 bg-dark-accent/50 px-4 py-2 rounded-full w-96">
        <Search size={18} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search by token or address..."
          className="bg-transparent border-none outline-none text-sm w-full text-white"
        />
      </div>

      <div className="flex items-center gap-6">
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Connect Wallet
        </button>
        <div className="flex items-center gap-4 text-gray-400">
          <Bell size={20} className="cursor-pointer hover:text-white" />
          <div className="w-8 h-8 rounded-full bg-dark-accent flex items-center justify-center cursor-pointer hover:text-white">
            <User size={18} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;

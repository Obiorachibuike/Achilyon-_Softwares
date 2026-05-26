import { useEffect, useState, useRef } from 'react';
import { Terminal, Bot, Zap, MessageSquare, Play, Square, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

export function BotTerminal() {
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), msg: "Initializing Discovery Bot v2.0...", type: 'info' },
    { time: new Date().toLocaleTimeString(), msg: "Connecting to multi-chain indexers...", type: 'info' },
  ]);
  const [isLive, setIsLive] = useState(true);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const actions = [
        "Scraping Telegram Alpha channels...",
        "Analyzing sentiment spike on $PEPE...",
        "Detected whale wallet accumulation on Base...",
        "Parsing Discord developer logs for new deployments...",
        "Calculating risk score for 0x4a...2f1...",
        "Social signal spike detected on $SOL...",
        "Liquidity locked verified for new pair...",
      ];

      const newLog = {
        time: new Date().toLocaleTimeString(),
        msg: actions[Math.floor(Math.random() * actions.length)],
        type: Math.random() > 0.8 ? 'warning' : 'info'
      };

      setLogs(prev => [...prev.slice(-49), newLog]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isLive]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex-1 p-6 flex flex-col space-y-6 overflow-hidden">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Bot Intelligence</h2>
            <p className="text-xs text-muted-foreground">Real-time chat scraping & alpha discovery</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsLive(!isLive)}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              isLive ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-green-500/10 text-green-500 border border-green-500/20"
            )}
          >
            {isLive ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            <span>{isLive ? "Stop Bot" : "Start Bot"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Terminal Logs */}
        <div className="lg:col-span-2 bg-[#0a0a0c] border border-border rounded-xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border bg-secondary/30 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal size={14} className="text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">discovery-bot-logs.sh</span>
            </div>
            <div className="flex space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
            </div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2 scrollbar-thin scrollbar-thumb-border">
            {logs.map((log, i) => (
              <div key={i} className="flex space-x-3">
                <span className="text-muted-foreground">[{log.time}]</span>
                <span className={cn(
                  log.type === 'warning' ? "text-yellow-500" : "text-green-500"
                )}>
                  {log.type === 'warning' ? "(!) " : "> "}
                  {log.msg}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Intelligence Sidebar */}
        <div className="space-y-6 overflow-y-auto pr-2">
          {/* Signal Cards */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-bold flex items-center space-x-2">
              <Zap size={16} className="text-yellow-500" />
              <span>High Confidence Trade</span>
            </h3>
            <div className="p-3 bg-secondary/50 rounded-lg border border-border space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold">Buy Recommendation</span>
                <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded">94% CONFIDENCE</span>
              </div>
              <div className="text-sm font-bold">TOKEN: $GHOST</div>
              <div className="text-[10px] text-muted-foreground">
                Reason: Significant social volume spike (320%) + smart money accumulation detected on Solana.
              </div>
              <button className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">
                Place Auto-Trade
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-bold flex items-center space-x-2">
              <MessageSquare size={16} className="text-blue-500" />
              <span>Alpha Chat Scraper</span>
            </h3>
            <div className="space-y-3">
              {[
                { channel: "Telegram: Alpha Leaks", msg: "Buying $PEPE on this dip...", sentiment: "Bullish" },
                { channel: "Discord: Whale Alerts", msg: "Large movement detected on $SOL", sentiment: "Neutral" },
                { channel: "Twitter: Top Traders", msg: "Base summer is just starting", sentiment: "Bullish" },
              ].map((alpha, i) => (
                <div key={i} className="p-2 bg-secondary/20 rounded border border-border space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted-foreground">{alpha.channel}</span>
                    <span className="text-[9px] text-blue-400 uppercase font-bold">{alpha.sentiment}</span>
                  </div>
                  <div className="text-[11px] italic text-foreground">&quot;{alpha.msg}&quot;</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 bg-red-500/5 border-red-500/20">
             <h3 className="text-sm font-bold flex items-center space-x-2 text-red-500 mb-4">
              <AlertTriangle size={16} />
              <span>Rug-Check Bot</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Honeypot:</span>
                <span className="text-green-500 font-bold">NO</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span className="text-green-500 font-bold">0% / 0%</span>
              </div>
              <div className="flex justify-between">
                <span>Liquidity:</span>
                <span className="text-yellow-500 font-bold">UNLOCKED (DANGER)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

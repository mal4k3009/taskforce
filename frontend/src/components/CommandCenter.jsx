import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, TerminalSquare, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import AgentNodeOrbit from './AgentNodeOrbit';

const CommandCenter = ({ agents, payments, stats, onDeploy, taskState, sseEvents, onSelectAgent }) => {
  const [taskInput, setTaskInput] = useState('');
  const logEndRef = useRef(null);

  // Auto-scroll the log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sseEvents]);

  const handleDeploy = () => {
    if (taskInput.trim()) {
      onDeploy(taskInput);
    }
  };

  const getEventBadge = (type) => {
    switch(type) {
      case 'PAYMENT_INITIATED':
      case 'PAYMENT_CONFIRMED':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-secondary/20 text-secondary border border-secondary/30">PAYMENT</span>;
      case 'AGENT_SELECTED':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-primary/20 text-primary border border-primary/30">AGENT</span>;
      case 'TASK_COMPLETED':
      case 'SUBTASK_COMPLETED':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-success/20 text-success border border-success/30">COMPLETED</span>;
      case 'ERROR':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30">ERROR</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] bg-gray-500/20 text-gray-400 border border-gray-500/30">SYSTEM</span>;
    }
  };

  return (
    <div className="flex h-full w-full">
      {/* LEFT PANEL */}
      <div className="w-72 border-r border-white/10 glass-panel flex flex-col h-full z-10">
        <div className="p-6 border-b border-white/5 flex items-center space-x-3">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h1 className="font-bold text-xl tracking-wide"><span className="text-white">TASK</span><span className="text-primary">FORCE</span></h1>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest">Autonomous Agent Economy</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse ml-auto" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <h2 className="text-gray-500 text-xs font-semibold tracking-widest uppercase mb-2">Registered Agents</h2>
          <div className="space-y-2">
            {agents.map(agent => (
              <motion.div 
                key={agent.agent_id}
                whileHover={{ scale: 1.02 }}
                onClick={() => onSelectAgent(agent)}
                className="p-3 rounded border border-white/5 bg-white/5 cursor-pointer hover-glow flex flex-col gap-2"
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${agent.avatar_seed}`} 
                    alt="avatar" 
                    className="w-8 h-8 rounded-full border border-primary/50" 
                  />
                  <div>
                    <h3 className="text-sm font-medium text-white">{agent.name}</h3>
                    <p className="text-xs text-gray-400">{agent.specialty}</p>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full ml-auto ${agent.reputation_score > 75 ? 'bg-success animate-pulse' : agent.reputation_score > 50 ? 'bg-warning' : 'bg-red-500'}`} />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-primary to-secondary"
                      initial={{ width: 0 }}
                      animate={{ width: `${agent.reputation_score}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-300">{agent.reputation_score.toFixed(1)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/5 bg-black/40">
          <h2 className="text-gray-500 text-xs font-semibold tracking-widest uppercase mb-3">Network Stats</h2>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Avalanche Fuji</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-success">Live</span>
              <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-white/5 p-2 rounded">
              <div className="text-[10px] text-gray-500 uppercase">Tasks Settled</div>
              <motion.div className="font-mono text-sm text-white">{stats.total_tasks}</motion.div>
            </div>
            <div className="bg-white/5 p-2 rounded">
              <div className="text-[10px] text-gray-500 uppercase">Total Value</div>
              <motion.div className="font-mono text-sm text-secondary">${stats.total_value_settled_usd.toFixed(2)}</motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL */}
      <div className="flex-1 flex flex-col h-full relative z-0">
        <div className="p-8 pb-4">
          <div className="relative">
            <textarea
              className="w-full h-32 terminal-input rounded-none focus:ring-1 focus:ring-primary shadow-2xl"
              placeholder="Describe your task... agents will handle the rest."
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              disabled={taskState === 'RUNNING'}
            />
            <TerminalSquare className="absolute top-4 right-4 w-5 h-5 text-primary/40" />
            <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs text-primary/60 font-mono">
              <span className="w-2 h-4 bg-primary animate-blink inline-block" />
              Ready for input
            </div>
          </div>
          <div className="flex justify-between items-center mt-4">
            <span className="text-xs text-gray-500 font-mono">{taskInput.length} bytes</span>
            <button
              onClick={handleDeploy}
              disabled={!taskInput.trim() || taskState === 'RUNNING'}
              className="px-6 py-2 bg-primary hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold tracking-widest uppercase transition-all shadow-indigo-glow flex items-center gap-2"
            >
              {taskState === 'RUNNING' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Orchestrating...</>
              ) : 'Deploy Task'}
            </button>
          </div>
        </div>

        <div className="flex-1 p-8 pt-4 overflow-hidden flex flex-col">
          <h2 className="text-gray-500 text-xs font-semibold tracking-widest uppercase mb-2 flex items-center gap-2">
            Live Orchestration Feed
            {taskState === 'RUNNING' && <span className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse" />}
          </h2>
          <div className="flex-1 terminal-log rounded border border-white/10 relative">
            {!sseEvents.length && taskState !== 'RUNNING' ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <AgentNodeOrbit />
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {sseEvents.map((evt, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3"
                    >
                      <span className="text-gray-600 shrink-0">
                        [{new Date(evt.timestamp * 1000).toISOString().substr(11, 8)}]
                      </span>
                      {getEventBadge(evt.event_type)}
                      <span className={`flex-1 ${evt.event_type === 'ERROR' ? 'text-red-400' : 'text-gray-300'}`}>
                        {evt.message}
                      </span>
                      {evt.amount > 0 && (
                        <span className="text-warning font-mono">${evt.amount.toFixed(2)}</span>
                      )}
                      {evt.tx_hash && (
                        <span className="text-gray-500 truncate w-24" title={evt.tx_hash}>
                          {evt.tx_hash.substring(0, 10)}...
                        </span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-80 border-l border-white/10 glass-panel flex flex-col h-full z-10">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-gray-500 text-xs font-semibold tracking-widest uppercase mb-4">Payment Ledger</h2>
          <div className="space-y-3 overflow-y-auto max-h-[60vh]">
            {payments.map((p, idx) => (
              <div key={idx} className="bg-black/30 border border-white/5 p-3 rounded flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-secondary/20 text-secondary px-1 rounded">USDC</span>
                    <span className="font-mono text-sm text-white">${p.amount.toFixed(2)}</span>
                  </div>
                  {p.status === 'CONFIRMED' ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-warning animate-spin" />
                  )}
                </div>
                <div className="flex justify-between items-center text-xs font-mono text-gray-500">
                  <span className="truncate w-24" title={p.from_wallet}>{p.from_wallet.substring(0,8)}...</span>
                  <span>→</span>
                  <span className="truncate w-24" title={p.to_wallet}>{p.to_wallet.substring(0,8)}...</span>
                </div>
                <div className="text-[10px] text-gray-600 font-mono truncate">TX: {p.tx_hash}</div>
              </div>
            ))}
            {payments.length === 0 && (
              <div className="text-center text-xs text-gray-500 py-4">No payments yet.</div>
            )}
          </div>
        </div>
        
        <div className="p-6 flex-1 bg-black/20">
           <h2 className="text-gray-500 text-xs font-semibold tracking-widest uppercase mb-4 flex items-center gap-2">
            Active Mission <Activity className="w-3 h-3 text-primary" />
          </h2>
          {taskState === 'RUNNING' ? (
            <div className="p-4 border border-warning/30 bg-warning/5 rounded">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 text-warning animate-spin" />
                <span className="text-sm font-medium text-warning">In Progress</span>
              </div>
              <p className="text-xs text-gray-300 line-clamp-3">{taskInput}</p>
            </div>
          ) : (
             <div className="text-center text-xs text-gray-500 py-4 border border-white/5 border-dashed rounded">
               Awaiting deployment
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  TerminalSquare,
  CheckCircle2,
  Loader2,
  Plus,
  User,
  Wallet,
  Users,
  DollarSign,
} from 'lucide-react';
import AgentNodeOrbit from './AgentNodeOrbit';
import { ethers } from 'ethers';

const MOBILE_TABS = [
  { id: 'command', label: 'Command', icon: TerminalSquare },
  { id: 'agents', label: 'Agents', icon: Users },
  { id: 'ledger', label: 'Ledger', icon: DollarSign },
];

const CommandCenter = ({
  agents,
  payments,
  stats,
  onDeploy,
  taskState,
  sseEvents,
  onSelectAgent,
  onOpenDeployAgent,
  user,
  myAgents,
  earnings,
}) => {
  agents = agents || [];
  payments = payments || [];
  sseEvents = sseEvents || [];
  stats = stats || {};
  myAgents = myAgents || [];
  earnings = earnings || {};
  const [taskInput, setTaskInput] = useState('');
  const [mobileTab, setMobileTab] = useState('command');
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sseEvents]);

  // Switch to command tab when a task starts so users see the live feed
  useEffect(() => {
    if (taskState === 'RUNNING') {
      setMobileTab('command');
    }
  }, [taskState]);

  const [isPaying, setIsPaying] = useState(false);

  const handleDeploy = async () => {
    if (taskInput.trim()) {
      setIsPaying(true);
      try {
        if (!window.ethereum) throw new Error('MetaMask is required');
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const treasury =
          import.meta.env.VITE_TREASURY_WALLET_ADDRESS ||
          '0x7E42f545218Fd351c488B03560aB3C7881AAa677';

        const tx = await signer.sendTransaction({
          to: treasury,
          value: ethers.parseEther('0.0001'),
        });

        await tx.wait();

        onDeploy(taskInput, tx.hash);
        setTaskInput('');
      } catch (err) {
        console.error('Payment failed', err);
        alert('Payment failed or was rejected: ' + err.message);
      } finally {
        setIsPaying(false);
      }
    }
  };

  const getEventBadge = (type) => {
    switch (type) {
      case 'PAYMENT_INITIATED':
      case 'PAYMENT_CONFIRMED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] bg-secondary/20 text-secondary border border-secondary/30">
            PAYMENT
          </span>
        );
      case 'AGENT_SELECTED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] bg-primary/20 text-primary border border-primary/30">
            AGENT
          </span>
        );
      case 'TASK_COMPLETED':
      case 'SUBTASK_COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] bg-success/20 text-success border border-success/30">
            COMPLETED
          </span>
        );
      case 'ERROR':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30">
            ERROR
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] bg-gray-500/20 text-gray-400 border border-gray-500/30">
            SYSTEM
          </span>
        );
    }
  };

  const marketplaceAgents = agents.filter(
    (a) => !a.creator_user_id || a.creator_user_id !== user?.user_id
  );

  const panelVisibility = (tab) =>
    mobileTab === tab ? 'flex' : 'hidden lg:flex';

  return (
    <div className="relative flex flex-col lg:flex-row h-full w-full min-h-0 pb-14 lg:pb-0">
      {/* LEFT PANEL — Agents */}
      <div
        className={`${panelVisibility('agents')} w-full lg:w-72 border-r border-white/10 glass-panel flex-col h-full min-h-0 z-10`}
      >
        {/* Desktop header */}
        <div className="hidden lg:flex p-6 border-b border-white/5 items-center space-x-3 shrink-0">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h1 className="font-bold text-xl tracking-wide">
              <span className="text-white">TASK</span>
              <span className="text-primary">FORCE</span>
            </h1>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest">
              Autonomous Agent Economy
            </p>
          </div>
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse ml-auto" />
        </div>

        {/* Mobile header */}
        <div className="lg:hidden p-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
            Registered Agents
          </h2>
          <button
            onClick={onOpenDeployAgent}
            className="text-[10px] text-primary hover:text-indigo-400 transition-colors flex items-center gap-1 uppercase tracking-widest font-bold"
          >
            <Plus className="w-3 h-3" /> Deploy
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          <div className="hidden lg:flex items-center justify-between mb-2">
            <h2 className="text-gray-500 text-xs font-semibold tracking-widest uppercase">
              Registered Agents
            </h2>
            <button
              onClick={onOpenDeployAgent}
              className="text-[10px] text-primary hover:text-indigo-400 transition-colors flex items-center gap-1 uppercase tracking-widest font-bold"
            >
              <Plus className="w-3 h-3" /> Deploy
            </button>
          </div>

          {myAgents.length > 0 && (
            <div className="mb-4">
              <h3 className="text-[10px] text-secondary tracking-widest uppercase mb-2 flex items-center gap-1">
                <User className="w-3 h-3" /> My Agents
              </h3>
              <div className="space-y-2">
                {myAgents.map((agent) => (
                  <motion.div
                    key={agent.agent_id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => onSelectAgent(agent)}
                    className="p-3 rounded border border-secondary/20 bg-secondary/5 cursor-pointer hover-glow flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${agent.avatar_seed}`}
                        alt="avatar"
                        className="w-8 h-8 rounded-full border border-secondary/50 shrink-0"
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-white truncate">{agent.name}</h3>
                        <p className="text-xs text-gray-400 truncate">{agent.specialty}</p>
                      </div>
                      <div
                        className={`w-1.5 h-1.5 rounded-full ml-auto shrink-0 ${
                          agent.reputation_score > 75
                            ? 'bg-success animate-pulse'
                            : agent.reputation_score > 50
                              ? 'bg-warning'
                              : 'bg-red-500'
                        }`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-secondary to-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${agent.reputation_score}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-gray-300 shrink-0">
                        {agent.reputation_score.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-[10px] text-secondary font-mono flex items-center gap-1">
                      <Wallet className="w-3 h-3 shrink-0" /> Revenue:{' '}
                      ${earnings?.agents?.find((a) => a.agent_id === agent.agent_id)?.earned_usd?.toFixed(4) ||
                        '0.0000'}{' '}
                      USD
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <h3 className="text-[10px] text-gray-500 tracking-widest uppercase mb-2 flex items-center gap-1">
            <Users className="w-3 h-3" /> Marketplace
          </h3>
          <div className="space-y-2">
            {marketplaceAgents.map((agent) => (
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
                    className="w-8 h-8 rounded-full border border-primary/50 shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-white truncate">{agent.name}</h3>
                    <p className="text-xs text-gray-400 truncate">{agent.specialty}</p>
                  </div>
                  <div
                    className={`w-1.5 h-1.5 rounded-full ml-auto shrink-0 ${
                      agent.reputation_score > 75
                        ? 'bg-success animate-pulse'
                        : agent.reputation_score > 50
                          ? 'bg-warning'
                          : 'bg-red-500'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-secondary"
                      initial={{ width: 0 }}
                      animate={{ width: `${agent.reputation_score}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-300 shrink-0">
                    {agent.reputation_score.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {agent.creator_user_id && (
                    <span className="text-[9px] text-gray-500 font-mono">Deployed by user</span>
                  )}
                  {!agent.creator_user_id && (
                    <span className="text-[9px] text-primary/50 font-mono">System Agent</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/5 bg-black/40 shrink-0">
          <h2 className="text-gray-500 text-xs font-semibold tracking-widest uppercase mb-3">
            Network Stats
          </h2>
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
              <motion.div className="font-mono text-sm text-secondary">
                ${stats.total_value_settled_usd?.toFixed(4) || '0.0000'} USD
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL — Command */}
      <div
        className={`${panelVisibility('command')} flex-1 flex-col h-full min-h-0 relative z-0 w-full`}
      >
        <div className="p-4 sm:p-6 lg:p-8 pb-3 lg:pb-4 shrink-0">
          <div className="relative">
            <textarea
              className="w-full h-24 sm:h-28 lg:h-32 terminal-input rounded-none focus:ring-1 focus:ring-primary shadow-2xl text-sm"
              placeholder="Describe your task... agents will handle the rest."
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              disabled={taskState === 'RUNNING'}
            />
            <TerminalSquare className="absolute top-3 right-3 sm:top-4 sm:right-4 w-5 h-5 text-primary/40" />
            <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 flex items-center gap-2 text-xs text-primary/60 font-mono">
              <span className="w-2 h-4 bg-primary animate-blink inline-block" />
              <span className="hidden sm:inline">Ready for input</span>
              <span className="sm:hidden">Ready</span>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 mt-4">
            <span className="text-xs text-gray-500 font-mono text-center sm:text-left">
              {taskInput.length} bytes
            </span>
            <button
              onClick={handleDeploy}
              disabled={!taskInput.trim() || taskState === 'RUNNING' || isPaying}
              className="w-full sm:w-auto px-6 py-2.5 sm:py-2 bg-primary hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold tracking-widest uppercase transition-all shadow-indigo-glow flex items-center justify-center gap-2"
            >
              {isPaying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Authorizing...
                </>
              ) : taskState === 'RUNNING' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Orchestrating...
                </>
              ) : (
                'Deploy Task'
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 px-4 sm:px-6 lg:px-8 pb-4 overflow-hidden flex flex-col min-h-0">
          <h2 className="text-gray-500 text-xs font-semibold tracking-widest uppercase mb-2 flex items-center gap-2 shrink-0">
            Live Orchestration Feed
            {taskState === 'RUNNING' && (
              <span className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse" />
            )}
          </h2>
          <div className="flex-1 terminal-log rounded border border-white/10 relative min-h-[200px] lg:min-h-0">
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
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="flex items-stretch gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors relative group"
                    >
                      <div className="flex flex-col items-center mt-1 shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/50 shadow-indigo-glow" />
                        {idx !== sseEvents.length - 1 && (
                          <div className="w-px h-full bg-white/10 mt-2" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5 pb-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-gray-500 font-mono shrink-0">
                            {new Date(evt.timestamp * 1000).toISOString().substr(11, 8)}
                          </span>
                          {getEventBadge(evt.event_type)}

                          {evt.amount > 0 && (
                            <span className="text-[10px] text-warning font-mono bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20 flex items-center gap-1">
                              + {evt.amount.toFixed(4)} AVAX
                            </span>
                          )}
                          {evt.tx_hash && (
                            <span
                              className="text-[10px] text-gray-500 font-mono truncate max-w-[100px] sm:max-w-[140px] lg:max-w-none ml-auto opacity-50 group-hover:opacity-100 transition-opacity cursor-help"
                              title={evt.tx_hash}
                            >
                              TX: {evt.tx_hash.substring(0, 8)}...
                            </span>
                          )}
                        </div>

                        <p
                          className={`text-xs font-mono leading-relaxed break-words ${
                            evt.event_type === 'ERROR' ? 'text-red-400' : 'text-gray-300'
                          }`}
                        >
                          {evt.message}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Ledger */}
      <div
        className={`${panelVisibility('ledger')} w-full lg:w-80 border-l border-white/10 glass-panel flex-col h-full min-h-0 z-10`}
      >
        <div className="p-4 sm:p-6 border-b border-white/5 shrink-0">
          <h2 className="text-gray-500 text-xs font-semibold tracking-widest uppercase mb-4">
            Payment Ledger
          </h2>
          <div className="space-y-3 overflow-y-auto max-h-[40vh] lg:max-h-[60vh]">
            {payments.map((p, idx) => (
              <div
                key={idx}
                className="bg-black/30 border border-white/5 p-3 rounded flex flex-col gap-2"
              >
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] bg-secondary/20 text-secondary px-1 rounded shrink-0">
                      AVAX
                    </span>
                    <span className="font-mono text-sm text-white truncate">
                      {p.amount.toFixed(4)} AVAX
                    </span>
                  </div>
                  {p.status === 'CONFIRMED' ? (
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-warning animate-spin shrink-0" />
                  )}
                </div>
                <div className="flex justify-between items-center text-xs font-mono text-gray-500 gap-2">
                  <span className="truncate min-w-0" title={p.from_wallet}>
                    {p.from_wallet.substring(0, 8)}...
                  </span>
                  <span className="shrink-0">→</span>
                  <span className="truncate min-w-0 text-right" title={p.to_wallet}>
                    {p.to_wallet.substring(0, 8)}...
                  </span>
                </div>
                <div className="text-[10px] text-gray-600 font-mono truncate">
                  TX: {p.tx_hash}
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <div className="text-center text-xs text-gray-500 py-4">No payments yet.</div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 flex-1 bg-black/20 min-h-0 overflow-y-auto">
          <h2 className="text-gray-500 text-xs font-semibold tracking-widest uppercase mb-4 flex items-center gap-2">
            Active Mission <Activity className="w-3 h-3 text-primary" />
          </h2>
          {taskState === 'RUNNING' ? (
            <div className="p-4 border border-warning/30 bg-warning/5 rounded">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 text-warning animate-spin shrink-0" />
                <span className="text-sm font-medium text-warning">In Progress</span>
              </div>
              <p className="text-xs text-gray-300 line-clamp-4 break-words">{taskInput}</p>
            </div>
          ) : (
            <div className="text-center text-xs text-gray-500 py-4 border border-white/5 border-dashed rounded">
              Awaiting deployment
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-black/90 border-t border-white/10 backdrop-blur-md safe-area-bottom"
        aria-label="Mobile navigation"
      >
        <div className="flex items-stretch h-14">
          {MOBILE_TABS.map(({ id, label, icon: Icon }) => {
            const isActive = mobileTab === id;
            const showPulse = id === 'command' && taskState === 'RUNNING';
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMobileTab(id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                  isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-300'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="relative">
                  <Icon className="w-5 h-5" />
                  {showPulse && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-warning rounded-full animate-pulse" />
                  )}
                </span>
                <span className="text-[10px] font-medium tracking-wide uppercase">{label}</span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default CommandCenter;

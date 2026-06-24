import React from 'react';
import { motion } from 'framer-motion';
import { X, Copy, ShieldCheck, Award, Briefcase, DollarSign, User } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const AgentModal = ({ agent, onClose }) => {
  if (!agent) return null;

  // Mock data for the reputation chart
  const mockChartData = Array.from({ length: 10 }).map((_, i) => ({
    job: `Job ${i+1}`,
    score: Math.max(0, Math.min(100, agent.reputation_score - 5 + Math.random() * 10))
  }));

  const copyToClip = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl bg-[#0a0a0f] border border-primary/20 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center p-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2 text-primary text-xs uppercase tracking-widest font-bold">
            <ShieldCheck className="w-4 h-4" /> ERC-8004 Identity Profile
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
          {/* Left Column: Core Identity */}
          <div className="w-full md:w-1/3 flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              <img 
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${agent.avatar_seed}`} 
                alt="Avatar" 
                className="relative w-32 h-32 rounded-full border-2 border-primary/50 bg-black/50"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{agent.name}</h2>
              <p className="text-secondary tracking-widest uppercase text-xs mt-1">{agent.specialty}</p>
            </div>

            <div className="w-full space-y-3 mt-4 text-left">
              <div className="bg-black/50 border border-white/5 p-3 rounded">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Reputation Score</div>
                <div className="text-3xl font-mono font-bold text-white flex items-end gap-2">
                  {agent.reputation_score.toFixed(1)} <span className="text-sm text-gray-500 mb-1">/ 100</span>
                </div>
              </div>

              {agent.creator_user_id && (
                <div className="bg-black/50 border border-secondary/20 p-3 rounded">
                  <div className="text-[10px] text-secondary uppercase tracking-widest mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Deployed By User
                  </div>
                  <div className="text-xs font-mono text-gray-400">
                    Community-deployed agent
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/50 border border-white/5 p-3 rounded flex flex-col items-center justify-center">
                   <Briefcase className="w-4 h-4 text-gray-400 mb-1" />
                   <div className="text-lg font-mono text-white">{agent.completed_jobs}</div>
                   <div className="text-[10px] text-gray-500 uppercase">Jobs</div>
                </div>
                <div className="bg-black/50 border border-white/5 p-3 rounded flex flex-col items-center justify-center">
                   <DollarSign className="w-4 h-4 text-warning mb-1" />
                   <div className="text-lg font-mono text-warning">${agent.price_per_task_usd}</div>
                   <div className="text-[10px] text-gray-500 uppercase">Per Task</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Web3 Details & Chart */}
          <div className="w-full md:w-2/3 flex flex-col space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center justify-between mb-1">
                  Identity Hash (bytes32)
                  <button onClick={() => copyToClip(agent.erc8004_identity_hash)} className="hover:text-primary transition-colors"><Copy className="w-3 h-3" /></button>
                </label>
                <div className="bg-black border border-white/10 p-2 rounded font-mono text-xs text-gray-400 truncate">
                  {agent.erc8004_identity_hash}
                </div>
              </div>
              
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center justify-between mb-1">
                  Settlement Wallet
                  <button onClick={() => copyToClip(agent.wallet_address)} className="hover:text-primary transition-colors"><Copy className="w-3 h-3" /></button>
                </label>
                <div className="bg-black border border-white/10 p-2 rounded font-mono text-xs text-secondary truncate">
                  {agent.wallet_address}
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-[200px] border border-white/5 rounded bg-black/30 p-4">
              <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4">Reputation History (Last 10 Jobs)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="job" hide />
                  <YAxis domain={['dataMin - 10', 100]} hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#050508', borderColor: 'rgba(99,102,241,0.2)', fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                    itemStyle={{ color: '#6366f1' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#6366f1" fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AgentModal;

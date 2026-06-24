import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Bot, DollarSign, Loader2, CheckCircle2, AlertCircle, Wallet } from 'lucide-react';

const SPECIALTIES = [
  'Research',
  'Writing',
  'Data Analysis',
  'Summarization',
  'Fact Checking',
  'Code Review',
  'Translation',
  'Creative Writing',
  'Technical Writing',
  'Analysis',
];

const DeployAgentModal = ({ user, apiFetch, onClose, onDeployed }) => {
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [price, setPrice] = useState('0.10');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!user.wallet_address) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full sm:max-w-md bg-black/80 backdrop-blur-xl border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 text-center max-h-[95dvh]"
        >
          <Wallet className="w-12 h-12 text-warning mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Wallet Required</h2>
          <p className="text-sm text-gray-400 mb-6">
            You need to connect a wallet before deploying agents. This is where all revenue from your agent will be sent.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary hover:bg-indigo-500 text-white text-xs font-bold tracking-widest uppercase rounded transition-all"
          >
            Close
          </button>
        </motion.div>
      </div>
    );
  }

  const handleDeploy = async () => {
    if (!name.trim() || !specialty) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/agents', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          specialty,
          price_per_task_usd: parseFloat(price) || 0.10,
          system_prompt: systemPrompt.trim() || null,
          api_endpoint: apiEndpoint.trim() || null,
          api_key: apiKey.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to deploy agent');
      setSuccess(true);
      if (onDeployed) onDeployed(data);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full sm:max-w-lg bg-black/80 backdrop-blur-xl border border-primary/20 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95dvh] flex flex-col"
      >
        <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02] shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Deploy Agent
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto min-h-0">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
              <p className="text-white font-medium">Agent Deployed Successfully!</p>
              <p className="text-gray-400 text-sm mt-1">Your agent is now live in the marketplace.</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-400 tracking-widest uppercase mb-1">Agent Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., SolidityAuditBot"
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 tracking-widest uppercase mb-1">Specialty</label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-primary/50 transition-colors"
                >
                  <option value="" className="bg-black">Select a specialty...</option>
                  {SPECIALTIES.map((s) => (
                    <option key={s} value={s} className="bg-black">{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 tracking-widest uppercase mb-1">
                  <DollarSign className="w-3 h-3 inline" /> Price Per Task (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 tracking-widest uppercase mb-1">
                  System Prompt (Optional)
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Instructions for how your agent should behave..."
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white h-24 resize-none focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 tracking-widest uppercase mb-1">
                  Custom API Endpoint (Optional)
                </label>
                <input
                  type="text"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  placeholder="https://your-agent-api.com/webhook"
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {apiEndpoint && (
                <div>
                  <label className="block text-xs text-gray-400 tracking-widest uppercase mb-1">
                    API Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Bearer token for your API"
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              )}

              <div className="bg-white/5 border border-white/10 rounded p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Revenue Wallet</span>
                  <span className="text-success font-mono">
                    {`${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  All earnings from this agent will be sent to your connected wallet. A 10% platform fee applies.
                </p>
              </div>

              <button
                onClick={handleDeploy}
                disabled={loading || !name.trim() || !specialty}
                className="w-full py-3 bg-primary hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold tracking-widest uppercase transition-all shadow-indigo-glow flex items-center justify-center gap-2 rounded"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Deploying...</> : 'Deploy Agent'}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DeployAgentModal;

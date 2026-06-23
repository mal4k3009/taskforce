import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { User, X, Loader2, Save, Wallet, CheckCircle2, Unlink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProfileModal = ({ onClose }) => {
  const { user, updateProfile, disconnectWallet } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');

  const generateAvatarUrl = (name, email) => {
    const seed = name || email;
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectWallet();
    } catch (err) {
      setError(err.message || 'Failed to disconnect wallet');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      await updateProfile(fullName, bio);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Neural Profile
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-full blur opacity-40"></div>
              <img 
                src={generateAvatarUrl(fullName, user?.email)} 
                alt="Avatar" 
                className="relative w-24 h-24 rounded-full border-2 border-white/10 bg-black/50 object-cover"
              />
            </div>
            <p className="text-[10px] text-gray-500 tracking-widest uppercase text-center">
              Auto-generated identity core
            </p>
            {user?.wallet_address && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 border border-success/30 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                  <span className="text-[11px] font-mono text-success font-medium">
                    {`${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`}
                  </span>
                  <Wallet className="w-3 h-3 text-success/70 shrink-0" />
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-all disabled:opacity-50"
                  title="Disconnect Wallet"
                >
                  {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 tracking-widest uppercase mb-1">Operative Name</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 tracking-widest uppercase mb-1">Bio / Specialization</label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief description of your capabilities..."
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white h-24 resize-none focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-primary hover:bg-indigo-500 text-white text-xs font-bold tracking-widest uppercase rounded shadow-indigo-glow flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Data
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileModal;

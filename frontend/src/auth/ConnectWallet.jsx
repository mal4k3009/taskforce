import React, { useState } from 'react';
import { Wallet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from './AuthContext';

const ConnectWallet = () => {
  const { user, connectWallet } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setError('');
    setLoading(true);
    try {
      await connectWallet();
    } catch (err) {
      setError(err.message || 'Wallet connection failed');
    }
    setLoading(false);
  };

  const shorten = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="border-t border-white/5 pt-4 mt-4">
      <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">
        {user?.wallet_address ? 'Connected Wallet' : 'Link Wallet (Optional)'}
      </label>

      {user?.wallet_address ? (
        <div className="flex items-center gap-2 p-2.5 bg-success/10 border border-success/30 rounded">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <span className="text-xs font-mono text-success truncate">
            {shorten(user.wallet_address)}
          </span>
        </div>
      ) : (
        <>
          {error && (
            <div className="flex items-center gap-2 mb-2 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-[10px]">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {error}
            </div>
          )}
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full py-2 border border-dashed border-white/20 hover:border-secondary/50 text-gray-400 hover:text-secondary text-xs font-mono rounded transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
            ) : (
              <><Wallet className="w-4 h-4" /> Connect MetaMask</>
            )}
          </button>
        </>
      )}
    </div>
  );
};

export default ConnectWallet;

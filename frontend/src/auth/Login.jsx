import React, { useState } from 'react';
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from './AuthContext';

const Login = ({ onSwitch }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 block">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-black border border-white/10 rounded py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-600 focus:border-primary/50 focus:outline-none transition-colors"
            placeholder="you@example.com"
            required
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 block">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
          <input
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-black border border-white/10 rounded py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-600 focus:border-primary/50 focus:outline-none transition-colors"
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors"
          >
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-primary hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 rounded"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
      </button>

      <p className="text-center text-xs text-gray-500">
        Don't have an account?{' '}
        <button type="button" onClick={onSwitch} className="text-primary hover:underline">
          Register
        </button>
      </p>
    </form>
  );
};

export default Login;

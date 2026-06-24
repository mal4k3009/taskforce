import React, { useState, useEffect, useRef } from 'react';
import { Activity, Wallet, Loader2, Bot, LogOut, User, ChevronDown } from 'lucide-react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Login from './auth/Login';
import Register from './auth/Register';
import ConnectWallet from './auth/ConnectWallet';
import CommandCenter from './components/CommandCenter';
import ResultPanel from './components/ResultPanel';
import AgentModal from './components/AgentModal';
import ProfileModal from './components/ProfileModal';
import DeployAgentModal from './components/DeployAgentModal';

function AuthScreen() {
  const [mode, setMode] = useState('login');

  return (
    <div className="h-full w-full flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 w-full max-w-sm mx-auto my-auto">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
            <Activity className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-wide">
              <span className="text-white">TASK</span><span className="text-primary">FORCE</span>
            </h1>
          </div>
          <p className="text-gray-500 text-xs uppercase tracking-widest">Autonomous Agent Economy</p>
        </div>

        <div className="glass-panel rounded-xl p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-white mb-5">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>

          {mode === 'login' ? (
            <Login onSwitch={() => setMode('register')} />
          ) : (
            <Register onSwitch={() => setMode('login')} />
          )}

          <ConnectWallet />
        </div>

        <p className="text-center mt-6 text-[10px] text-gray-600">
          Secure authentication powered by Supabase
        </p>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, logout, apiFetch, connectWallet } = useAuth();
  const [walletLoading, setWalletLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [agents, setAgents] = useState([]);
  const [myAgents, setMyAgents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({ total_tasks: 0, total_value_settled_usd: 0 });
  const [earnings, setEarnings] = useState({ total_earned_usd: 0, agents: [] });
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [taskState, setTaskState] = useState(null);
  const [sseEvents, setSseEvents] = useState([]);
  const [selectedAgentProfile, setSelectedAgentProfile] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showDeployAgent, setShowDeployAgent] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const fetchData = async () => {
    const safeFetch = async (url, setter) => {
      try {
        const res = await apiFetch(url);
        if (res.ok) setter(await res.json());
      } catch {}
    };
    await Promise.all([
      safeFetch('/api/agents', setAgents),
      safeFetch('/api/payments', setPayments),
      safeFetch('/api/stats', setStats),
      safeFetch('/api/agents/mine', setMyAgents),
      safeFetch('/api/earnings', setEarnings),
    ]);
  };

  const handleDeployTask = async (taskText, tx_hash) => {
    setSseEvents([]);
    setResultData(null);
    setTaskState('RUNNING');

    try {
      const res = await apiFetch('/api/task', {
        method: 'POST',
        body: JSON.stringify({ task: taskText, tx_hash }),
      });
      const data = await res.json();
      setActiveTaskId(data.task_id);
      startSseStream(data.task_id);
    } catch (err) {
      console.error(err);
      setTaskState('FAILED');
    }
  };

  const startSseStream = (taskId) => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const eventSource = new EventSource(`${apiBase}/api/task/${taskId}/stream`);

    eventSource.onmessage = (event) => {
      const parsedData = JSON.parse(event.data);
      setSseEvents(prev => [...prev, parsedData]);

      if (parsedData.event_type === 'TASK_COMPLETED') {
        eventSource.close();
        setTaskState('COMPLETED');
        fetchTaskResult(taskId);
      } else if (parsedData.event_type === 'ERROR') {
        setTaskState('FAILED');
        eventSource.close();
      } else if (['PAYMENT_CONFIRMED', 'REPUTATION_UPDATED'].includes(parsedData.event_type)) {
        fetchData();
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      eventSource.close();
      setTaskState('FAILED');
    };
  };

  const fetchTaskResult = async (taskId) => {
    try {
      const res = await apiFetch(`/api/task/${taskId}/result`);
      const data = await res.json();
      setResultData(data);
    } catch (err) {
      console.error('Failed to fetch result', err);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 min-h-11 lg:h-9 bg-black/60 border-b border-white/5 flex items-center justify-between px-3 sm:px-4 z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Activity className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs font-bold tracking-wide shrink-0">
            <span className="text-white">TASK</span><span className="text-primary">FORCE</span>
          </span>

          {/* Desktop user info */}
          <span className="hidden lg:inline text-[10px] text-gray-600">|</span>
          <button
            onClick={() => setShowProfile(true)}
            className="hidden lg:flex text-[10px] text-gray-400 hover:text-white transition-colors font-mono items-center gap-1 truncate max-w-[180px]"
          >
            {user?.full_name || user?.email}
          </button>
          {user?.wallet_address && (
            <span className="hidden md:inline text-[10px] text-success font-mono shrink-0">
              {`${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`}
            </span>
          )}
          {myAgents.length > 0 && (
            <span className="hidden xl:flex text-[10px] text-warning font-mono items-center gap-1 shrink-0">
              <Bot className="w-3 h-3" /> Earned: ${earnings.total_earned_usd?.toFixed(4) || '0.0000'} USD
            </span>
          )}
        </div>

        {/* Desktop actions */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          {!user?.wallet_address && (
            <button
              onClick={async () => {
                setWalletLoading(true);
                try {
                  await connectWallet();
                } catch {}
                setWalletLoading(false);
              }}
              disabled={walletLoading}
              className="text-[10px] text-gray-500 hover:text-secondary uppercase tracking-widest transition-colors flex items-center gap-1"
            >
              {walletLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wallet className="w-3 h-3" />}
              Connect Wallet
            </button>
          )}
          <button
            onClick={logout}
            className="text-[10px] text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Mobile menu */}
        <div className="lg:hidden relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white transition-colors"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <User className="w-4 h-4 text-primary" />
            <ChevronDown className={`w-3 h-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50">
              <div className="p-3 border-b border-white/5">
                <p className="text-xs text-white font-medium truncate">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-[10px] text-gray-500 truncate mt-0.5">{user?.email}</p>
                {user?.wallet_address && (
                  <p className="text-[10px] text-success font-mono mt-1">
                    {`${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`}
                  </p>
                )}
                {myAgents.length > 0 && (
                  <p className="text-[10px] text-warning font-mono mt-1 flex items-center gap-1">
                    <Bot className="w-3 h-3 shrink-0" />
                    Earned: ${earnings.total_earned_usd?.toFixed(4) || '0.0000'} USD
                  </p>
                )}
              </div>
              <div className="p-2 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(true);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4 text-primary" />
                  Profile
                </button>
                {!user?.wallet_address && (
                  <button
                    type="button"
                    onClick={async () => {
                      setWalletLoading(true);
                      try {
                        await connectWallet();
                      } catch {}
                      setWalletLoading(false);
                      setMenuOpen(false);
                    }}
                    disabled={walletLoading}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {walletLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-secondary" />
                    ) : (
                      <Wallet className="w-4 h-4 text-secondary" />
                    )}
                    Connect Wallet
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <CommandCenter
          agents={agents}
          payments={payments}
          stats={stats}
          onDeploy={handleDeployTask}
          taskState={taskState}
          sseEvents={sseEvents}
          onSelectAgent={(agent) => setSelectedAgentProfile(agent)}
          onOpenDeployAgent={() => setShowDeployAgent(true)}
          user={user}
          myAgents={myAgents}
          earnings={earnings}
        />
      </div>

      {taskState === 'COMPLETED' && resultData && (
        <ResultPanel data={resultData} onClose={() => setTaskState(null)} />
      )}

      {selectedAgentProfile && (
        <AgentModal
          agent={selectedAgentProfile}
          onClose={() => setSelectedAgentProfile(null)}
        />
      )}

      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}

      {showDeployAgent && (
        <DeployAgentModal
          user={user}
          apiFetch={apiFetch}
          onClose={() => setShowDeployAgent(false)}
          onDeployed={() => { fetchData(); }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  return (
    <>
      {/* Global Background Video */}
      <video
        src="/bg_video.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="fixed top-0 left-0 w-full h-full object-cover -z-10"
      />
      <div className="fixed inset-0 bg-black/60 -z-10" />

      {loading ? (
        <div className="h-full w-full flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !user ? (
        <AuthScreen />
      ) : (
        <Dashboard />
      )}
    </>
  );
}

export default App;

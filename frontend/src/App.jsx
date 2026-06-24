import React, { useState, useEffect } from 'react';
import { Activity, Wallet, Loader2, Bot } from 'lucide-react';
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
    <div className="h-full w-full flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Activity className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-wide">
              <span className="text-white">TASK</span><span className="text-primary">FORCE</span>
            </h1>
          </div>
          <p className="text-gray-500 text-xs uppercase tracking-widest">Autonomous Agent Economy</p>
        </div>

        <div className="glass-panel rounded-xl p-6">
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
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    const safeFetch = async (url, setter) => {
      try {
        const res = await apiFetch(url, { _silent: true });
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

  const handleDeployTask = async (taskText) => {
    setSseEvents([]);
    setResultData(null);
    setTaskState('RUNNING');

    try {
      const res = await apiFetch('/api/task', {
        method: 'POST',
        body: JSON.stringify({ task: taskText }),
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
      <div className="h-9 bg-black/60 border-b border-white/5 flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold tracking-wide">
            <span className="text-white">TASK</span><span className="text-primary">FORCE</span>
          </span>
          <span className="text-[10px] text-gray-600">|</span>
          <button 
            onClick={() => setShowProfile(true)}
            className="text-[10px] text-gray-400 hover:text-white transition-colors font-mono flex items-center gap-1"
          >
            {user?.full_name || user?.email}
          </button>
          {user?.wallet_address && (
            <span className="text-[10px] text-success font-mono">
              {`${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`}
            </span>
          )}
          {myAgents.length > 0 && (
            <span className="text-[10px] text-warning font-mono flex items-center gap-1">
              <Bot className="w-3 h-3" /> Earned: ${earnings.total_earned_usd?.toFixed(2) || '0.00'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!user?.wallet_address && (
            <button
              onClick={async () => { setWalletLoading(true); try { await connectWallet(); } catch {} setWalletLoading(false); }}
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

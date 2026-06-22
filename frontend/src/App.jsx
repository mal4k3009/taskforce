import React, { useState, useEffect } from 'react';
import CommandCenter from './components/CommandCenter';
import ResultPanel from './components/ResultPanel';
import AgentModal from './components/AgentModal';

function App() {
  const [agents, setAgents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({ total_tasks: 0, total_value_settled_usd: 0 });
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [taskState, setTaskState] = useState(null); // 'RUNNING', 'COMPLETED', 'FAILED'
  const [sseEvents, setSseEvents] = useState([]);
  const [selectedAgentProfile, setSelectedAgentProfile] = useState(null);
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    fetchData();
    // Poll stats and payments every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [agentsRes, paymentsRes, statsRes] = await Promise.all([
        fetch('http://localhost:8000/api/agents'),
        fetch('http://localhost:8000/api/payments'),
        fetch('http://localhost:8000/api/stats')
      ]);
      setAgents(await agentsRes.json());
      setPayments(await paymentsRes.json());
      setStats(await statsRes.json());
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleDeployTask = async (taskText) => {
    setSseEvents([]);
    setResultData(null);
    setTaskState('RUNNING');
    
    try {
      const res = await fetch('http://localhost:8000/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskText })
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
    const eventSource = new EventSource(`http://localhost:8000/api/task/${taskId}/stream`);
    
    eventSource.onmessage = (event) => {
      const parsedData = JSON.parse(event.data);
      setSseEvents(prev => [...prev, parsedData]);
      
      // Update UI components dynamically based on events
      if (parsedData.event_type === 'TASK_COMPLETED') {
        eventSource.close();
        setTaskState('COMPLETED');
        fetchTaskResult(taskId);
      } else if (parsedData.event_type === 'ERROR') {
        setTaskState('FAILED');
        eventSource.close();
      } else if (['PAYMENT_CONFIRMED', 'REPUTATION_UPDATED'].includes(parsedData.event_type)) {
        // Fast refresh to show new stats/reputation
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
      const res = await fetch(`http://localhost:8000/api/task/${taskId}/result`);
      const data = await res.json();
      setResultData(data);
    } catch (err) {
      console.error('Failed to fetch result', err);
    }
  };

  return (
    <div className="relative w-full h-full">
      <CommandCenter 
        agents={agents} 
        payments={payments} 
        stats={stats}
        onDeploy={handleDeployTask}
        taskState={taskState}
        sseEvents={sseEvents}
        onSelectAgent={(agent) => setSelectedAgentProfile(agent)}
      />
      
      {taskState === 'COMPLETED' && resultData && (
        <ResultPanel data={resultData} onClose={() => setTaskState(null)} />
      )}

      {selectedAgentProfile && (
        <AgentModal 
          agent={selectedAgentProfile} 
          onClose={() => setSelectedAgentProfile(null)} 
        />
      )}
    </div>
  );
}

export default App;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Bot, ChevronDown, ChevronUp, FileText } from 'lucide-react';

const ResultPanel = ({ data, onClose }) => {
  const [openSubtask, setOpenSubtask] = useState(null);

  if (!data) return null;

  const totalCost = data.subtasks ? data.subtasks.reduce((sum, s) => sum + s.cost, 0) : 0;

  return (
    <motion.div 
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 120 }}
      className="absolute bottom-0 left-0 right-0 h-[65vh] bg-space border-t border-primary/30 shadow-[0_-10px_40px_rgba(99,102,241,0.1)] z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="bg-success/20 p-2 rounded text-success border border-success/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">MISSION ACCOMPLISHED</h2>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-400 font-mono">
              <span>Total Cost: <span className="text-warning">${totalCost.toFixed(2)}</span></span>
              <span>Agents Hired: <span className="text-primary">{data.subtasks?.length || 0}</span></span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Subtask Breakdown */}
        <div className="w-1/3 border-r border-white/10 overflow-y-auto p-4 bg-black/40">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Subtask Breakdown</h3>
          <div className="space-y-3">
            {data.subtasks && data.subtasks.map((st, idx) => (
              <div key={idx} className="border border-white/10 rounded bg-white/5 overflow-hidden">
                <div 
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/10"
                  onClick={() => setOpenSubtask(openSubtask === idx ? null : idx)}
                >
                  <div className="flex items-center gap-3">
                    <Bot className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-gray-200">{st.agent}</span>
                  </div>
                  {openSubtask === idx ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </div>
                
                <AnimatePresence>
                  {openSubtask === idx && (
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-white/10"
                    >
                      <div className="p-3 space-y-2 bg-black/20">
                        <p className="text-xs text-gray-400"><span className="text-gray-500">Task:</span> {st.description}</p>
                        <div className="flex items-center gap-4 text-[10px] font-mono">
                          <span className="text-warning">Cost: ${st.cost.toFixed(2)}</span>
                          <span className="text-success">Reputation: {st.reputation_change}</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-300 font-mono bg-black p-2 rounded border border-white/5 max-h-32 overflow-y-auto whitespace-pre-wrap">
                          {st.output}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Synthesis */}
        <div className="flex-1 overflow-y-auto p-8 relative bg-grid-pattern">
          <div className="absolute inset-0 bg-space/90" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Final Synthesized Output
            </h3>
            <div className="prose prose-invert prose-p:text-gray-300 prose-headings:text-white border-l-2 border-primary/50 pl-6 py-2">
              {data.final_result ? (
                <div dangerouslySetInnerHTML={{ __html: data.final_result.replace(/\n/g, '<br/>') }} />
              ) : (
                <p className="text-gray-500 italic">No output generated.</p>
              )}
            </div>
            
            <div className="mt-10 flex items-center gap-4">
              <button onClick={onClose} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold tracking-widest uppercase transition-all rounded">
                Deploy Another Task
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ResultPanel;

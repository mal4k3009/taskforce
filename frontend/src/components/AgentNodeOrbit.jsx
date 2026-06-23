import React from 'react';

const AgentNodeOrbit = () => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center opacity-90">
      <div className="relative w-48 h-48 rounded-full bg-white/[0.01] border border-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex items-center justify-center overflow-hidden">
        {/* Liquid reflection highlight */}
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-gradient-to-br from-white/[0.08] to-transparent rounded-full transform -rotate-12 blur-md"></div>
        {/* Inner subtle glow */}
        <div className="absolute w-24 h-24 rounded-full bg-primary/10 blur-xl"></div>
      </div>
      
      <div className="mt-8 tracking-[0.2em] uppercase text-xs text-white/50 font-light">
        Awaiting Deployment
      </div>
    </div>
  );
};

export default AgentNodeOrbit;

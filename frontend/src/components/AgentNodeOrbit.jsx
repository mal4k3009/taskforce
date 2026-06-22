import React from 'react';

// Pure CSS animation component for empty state
const AgentNodeOrbit = () => {
  return (
    <div className="relative w-64 h-64 flex items-center justify-center opacity-60">
      {/* Center Hub */}
      <div className="absolute w-12 h-12 bg-primary/20 rounded-full border border-primary/50 shadow-indigo-glow flex items-center justify-center">
        <div className="w-4 h-4 bg-primary rounded-full animate-pulse"></div>
      </div>
      
      {/* Orbit Ring 1 */}
      <div className="absolute w-32 h-32 rounded-full border border-white/5 animate-[spin_8s_linear_infinite]">
        <div className="absolute top-0 left-1/2 -ml-2 -mt-2 w-4 h-4 bg-secondary/50 rounded-full shadow-cyan-glow"></div>
      </div>
      
      {/* Orbit Ring 2 */}
      <div className="absolute w-48 h-48 rounded-full border border-white/5 animate-[spin_12s_linear_infinite_reverse]">
        <div className="absolute top-1/2 right-0 -mr-2 -mt-2 w-4 h-4 bg-success/50 rounded-full"></div>
        <div className="absolute bottom-0 left-1/2 -ml-2 -mb-2 w-4 h-4 bg-warning/50 rounded-full"></div>
      </div>
    </div>
  );
};

export default AgentNodeOrbit;

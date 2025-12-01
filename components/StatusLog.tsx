import React, { useEffect, useRef } from 'react';
import { GenerationStep } from '../types';
import { Loader2, CheckCircle2, Search, PenTool, AlertCircle } from 'lucide-react';

interface StatusLogProps {
  steps: GenerationStep[];
}

const StatusLog: React.FC<StatusLogProps> = ({ steps }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [steps]);

  const getIcon = (type: GenerationStep['type']) => {
    switch (type) {
      case 'search': return <Search className="w-4 h-4 text-blue-500" />;
      case 'writing': return <PenTool className="w-4 h-4 text-purple-500" />;
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />;
    }
  };

  if (steps.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm max-h-60 overflow-y-auto mb-6">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">系统运行日志 (Activity Log)</h3>
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-start gap-3 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mt-0.5 shrink-0">
              {getIcon(step.type)}
            </div>
            <div className={`flex-1 ${step.type === 'error' ? 'text-red-600' : 'text-gray-700'}`}>
              {step.message}
            </div>
            <div className="text-xs text-gray-400 tabular-nums">
              {new Date(step.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default StatusLog;
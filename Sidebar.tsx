
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Terminal, Layers, Activity, Database, 
  Copy, Check, ChevronRight, ChevronDown 
} from 'lucide-react';
import { OpCode, Instruction, EvalResult, Closure } from './types';
import { Env } from './interpreter';

const SYSTEM_VARS = new Set(['print', 'to_n', 'to_s']);

const InspectorNode = ({ name, value, depth = 0 }: { name: string; value: any; depth?: number; key?: React.Key }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isClosure = value && typeof value === 'object' && value.type === 'Closure';
  if (SYSTEM_VARS.has(name)) return null;

  const renderValue = (val: any) => {
    if (val === null) return <span className="text-gray-500 italic">null</span>;
    if (typeof val === 'function') return <span className="text-blue-400 italic">native fn</span>;
    if (isClosure) return <span className="text-orange-300">Block(${val.params.join(', ')})</span>;
    if (typeof val === 'string') return <span className="text-green-400">"{val}"</span>;
    if (Array.isArray(val)) return <span className="text-yellow-400">[Array {val.length}]</span>;
    return <span className="text-purple-400">{String(val)}</span>;
  };

  return (
    <div className="flex flex-col select-none">
      <div 
        className={`flex items-center gap-2 py-1 px-2 rounded-md hover:bg-white/5 cursor-pointer transition-colors ${isOpen ? 'bg-white/5' : ''}`}
        onClick={() => isClosure && setIsOpen(!isOpen)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isClosure ? (
          isOpen ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />
        ) : (
          <div className="w-3" />
        )}
        <span className="text-blue-400 font-bold whitespace-nowrap text-[11px]">{name}</span>
        <span className="text-gray-600">:</span>
        <span className="truncate flex-1 text-[11px] font-mono">{renderValue(value)}</span>
      </div>
      {isOpen && isClosure && value.env && (
        <div className="flex flex-col border-l border-white/5 ml-3 relative">
           {/* Closures in debug mode might show optimized Envs if mapped back, otherwise we skip */}
           <div className="text-[10px] text-gray-600 italic px-2">Optimized Env</div>
        </div>
      )}
    </div>
  );
};

interface SidebarProps {
  debugMode: boolean;
  operandStack: EvalResult[];
  instructions: Instruction[];
  currentIp: number;
  output: string[];
  environment: Env | null;
}

export function Sidebar({ 
  debugMode, 
  operandStack, 
  instructions, 
  currentIp, 
  output, 
  environment 
}: SidebarProps) {
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [width, setWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output]);

  const copyOutput = () => {
    navigator.clipboard.writeText(output.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = window.innerWidth - mouseMoveEvent.clientX;
        if (newWidth > 250 && newWidth < 800) {
          setWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <aside 
      className="flex flex-col bg-[#161b22] border-l border-[#30363d] shadow-2xl z-10 overflow-hidden h-full relative group/sidebar"
      style={{ width: width, userSelect: isResizing ? 'none' : 'auto' }}
    >
      {/* Resizer Handle */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 transition-colors z-50 ${isResizing ? 'bg-blue-500 w-1' : 'bg-transparent'}`}
        onMouseDown={startResizing}
      />
      
      {/* Debug Stack Visualizer */}
      {debugMode && (
        <div className="flex-[0_0_25%] min-h-[150px] flex flex-col border-b border-[#30363d] animate-in slide-in-from-right-10 duration-300">
           <div className="px-4 py-2 border-b border-[#30363d] bg-[#0d1117] text-xs font-black text-blue-400 uppercase tracking-widest flex justify-between items-center shadow-inner">
              <div className="flex items-center gap-2"><Database size={14} /> Operand Stack</div>
              <span className="text-[9px] text-gray-700 bg-blue-500/5 px-2 py-0.5 rounded">LIFO</span>
           </div>
           <div className="flex-1 overflow-y-auto p-3 flex flex-col-reverse gap-1.5 custom-scrollbar bg-black/20">
              {operandStack.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[10px] text-gray-700 italic opacity-50">Empty Stack</div>
              ) : (
                operandStack.map((val, i) => (
                  <div key={i} className="p-2 bg-[#0d1117] border border-blue-500/30 rounded text-[11px] font-mono flex justify-between animate-in slide-in-from-bottom-2 shadow-sm">
                     <span className="text-gray-600 font-bold mr-2">[{i}]</span>
                     <span className="text-blue-300 truncate font-bold">
                       {val && (val as Closure).type === 'Closure' ? 'Closure' : String(val)}
                     </span>
                  </div>
                ))
              )}
           </div>
        </div>
      )}

      {/* Bytecode */}
      <div className={`flex-1 min-h-[200px] flex flex-col border-b border-[#30363d] transition-all duration-300`}>
        <div className="px-4 py-2 border-b border-[#30363d] bg-[#0d1117] flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
            <Layers size={14} className="text-pink-500" /> Bytecode
          </div>
          {debugMode && <span className="text-blue-400 text-[10px] font-mono flex items-center gap-1"><Activity size={12} /> IP: {currentIp}</span>}
        </div>
        <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] custom-scrollbar bg-black/10">
          {instructions.map((instr, idx) => (
            <div key={idx} className={`flex gap-3 px-2 py-0.5 rounded transition-all duration-75 ${instr.ip === currentIp ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100' : 'text-gray-500 opacity-60'}`}>
              <span className="w-8 text-right opacity-50 text-[10px] select-none">{instr.ip}</span>
              <span className="text-pink-400 font-bold w-20 truncate">{OpCode[instr.op]}</span>
              <span className="text-blue-300 truncate max-w-[80px]">{instr.arg !== undefined ? String(instr.arg) : ""}</span>
              {instr.arg2 !== undefined && <span className="text-orange-300 truncate max-w-[50px]">{String(instr.arg2)}</span>}
              {instr.arg3 !== undefined && <span className="text-green-300 truncate max-w-[50px]">{String(instr.arg3)}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Console Output */}
      <div className="flex-1 min-h-[200px] flex flex-col bg-[#0d1117]/30 border-b border-[#30363d]">
        <div className="px-4 py-2 border-b border-[#30363d] bg-[#0d1117] flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
            <Terminal size={14} className="text-green-500" /> Terminal
          </div>
          <button onClick={copyOutput} className="p-1 text-gray-600 hover:text-white transition-colors" title="Copy output">
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] custom-scrollbar selection:bg-green-500/20">
          {output.map((line, i) => {
            const isError = line.startsWith('[RUNTIME ERROR]') || line.includes('TRAP');
            return (
              <div key={i} className={`mb-0.5 flex gap-2 ${isError ? 'text-red-400' : 'text-blue-300'}`}>
                <span className="text-gray-700 font-bold opacity-30 select-none">❯</span>
                <span className="leading-tight whitespace-pre-wrap flex-1 break-all">{line}</span>
              </div>
            );
          })}
          <div ref={consoleEndRef} />
        </div>
      </div>

      {/* State Inspector */}
      <div className={`flex-1 min-h-[200px] flex flex-col bg-[#0d1117]/50 transition-all duration-300`}>
        <div className="px-4 py-2 bg-[#0d1117] border-b border-[#30363d] text-xs font-black text-gray-400 uppercase tracking-widest sticky top-0 z-10">
          Runtime Data Pool
        </div>
        <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] custom-scrollbar bg-black/5">
          {!environment ? (
            <div className="h-full flex items-center justify-center text-[10px] text-gray-700 uppercase tracking-widest opacity-40 italic">
              Runtime environment empty
            </div>
          ) : (
            <div className="space-y-1">
              {Object.entries(environment.data).filter(([k]) => !SYSTEM_VARS.has(k)).map(([key, val]) => (
                <InspectorNode key={key} name={key} value={val} />
              ))}
              {Object.entries(environment.data).filter(([k]) => !SYSTEM_VARS.has(k)).length === 0 && (
                 <div className="text-center py-4 text-[10px] text-gray-700 uppercase tracking-widest">No variables defined</div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

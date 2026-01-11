
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, FileCode, BookOpen, X, Cpu, 
  Zap, Plus, Menu, ArrowRight, RotateCcw,
  Bug, FolderOpen, Save, Layers, Terminal, Database, Share2
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { tokenize, Parser, createGlobalEnv, Env, disassemble } from './interpreter';
import { Compiler } from './compiler';
import { VM } from './vm';
import { Instruction, EvalResult } from './types';
import { EXAMPLE_CATEGORIES, ALL_EXAMPLES } from './examples_index';
import { Sidebar } from './Sidebar';

const APP_VERSION = "0.7.3-share";

const Modal = ({ isOpen, onClose, title, children, icon: Icon, wide = false }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className={`bg-[#161b22] border border-[#30363d] rounded-2xl w-full ${wide ? 'max-w-5xl' : 'max-w-4xl'} max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/10`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="text-blue-400" size={24} />}
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-hidden bg-[#0d1117]/30 min-h-0 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
};

interface Tab {
  id: string;
  title: string;
  code: string;
}

export default function App() {
  // Tab State
  const [tabs, setTabs] = useState<Tab[]>([{ id: '1', title: 'main.blocks', code: ALL_EXAMPLES['basics/intro.blk'].code }]);
  const [activeTabId, setActiveTabId] = useState('1');
  
  // Execution State
  const [output, setOutput] = useState<string[]>(["Blocks VM ready.", `Version: ${APP_VERSION}`]);
  const [environment, setEnvironment] = useState<Env | null>(null);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [execTime, setExecTime] = useState<number>(0);
  
  // UI State
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isExamplesOpen, setIsExamplesOpen] = useState(false);
  const [exampleCategory, setExampleCategory] = useState<string>("Essentials");
  
  // Debug State
  const [debugMode, setDebugMode] = useState(false);
  const [vm, setVm] = useState<VM | null>(null);
  const [currentIp, setCurrentIp] = useState(-1);
  const [operandStack, setOperandStack] = useState<EvalResult[]>([]);
  
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<any>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived active code
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const activeCode = activeTab.code;

  // Initialize from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedCode = params.get('c');
    if (sharedCode) {
      try {
        const decoded = decodeURIComponent(atob(sharedCode));
        // Replace initial tab or add new one? Let's replace for a cleaner "landing" experience
        setTabs([{ id: 'shared', title: 'Shared Snippet', code: decoded }]);
        setActiveTabId('shared');
        setOutput(prev => [...prev, "Loaded code from URL."]);
      } catch (e) {
        setOutput(prev => [...prev, "Failed to load shared code: Invalid format."]);
      }
    }
  }, []);

  const updateTabCode = (newCode: string | undefined) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, code: newCode || '' } : t));
  };

  const createTab = (code: string = '', title: string = 'untitled.blocks') => {
    const newId = Date.now().toString();
    setTabs(prev => [...prev, { id: newId, title, code }]);
    setActiveTabId(newId);
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Don't close last tab
    
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  // File I/O
  const handleSaveFile = useCallback(() => {
    const blob = new Blob([activeCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Ensure filename ends with .blk
    const filename = activeTab.title.endsWith('.blk') || activeTab.title.endsWith('.blocks') 
      ? activeTab.title 
      : `${activeTab.title}.blk`;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeCode, activeTab.title]);

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      createTab(content, file.name);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset
  };

  const handleShare = () => {
    try {
      const encoded = btoa(encodeURIComponent(activeCode));
      const url = new URL(window.location.href);
      url.searchParams.set('c', encoded);
      window.history.pushState({}, '', url);
      navigator.clipboard.writeText(url.toString());
      setOutput(prev => [...prev, "Link copied to clipboard! Share your code."]);
    } catch (e) {
      setOutput(prev => [...prev, "Error generating link."]);
    }
  };

  const handleEditorWillMount = (monaco: any) => {
    monaco.languages.register({ id: 'blocks' });
    monaco.languages.setMonarchTokensProvider('blocks', {
      tokenizer: {
        root: [
          [/#.*/, 'comment'],
          [/"[^"]*"/, 'string'],
          [/-?\d+/, 'number'],
          [/\b(if|then|else)\b/, 'keyword'],
          [/\b(print|to_n|to_s)\b/, 'type'],
          [/\$[a-zA-Z_]\w*/, 'variable.parameter'], 
          [/[a-zA-Z_]\w*/, 'identifier'],
          [/[[\]]/, 'delimiter.bracket'],
          [/[()]/, 'delimiter.parenthesis'],
          [/==|[+\-*/%<>]=?/, 'operator'],
        ]
      }
    });

    monaco.editor.defineTheme('blocks-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'variable.parameter', foreground: 'FF9D00', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'FF79C6', fontStyle: 'bold' },
        { token: 'type', foreground: '8BE9FD' },
        { token: 'comment', foreground: '6272A4', fontStyle: 'italic' },
        { token: 'number', foreground: 'BD93F9' },
        { token: 'string', foreground: 'F1FA8C' },
        { token: 'operator', foreground: 'FF79C6' },
      ],
      colors: { 'editor.background': '#0d1117' }
    });
  };

  const clearDecorations = () => {
    if (editorRef.current && decorationsRef.current) {
      editorRef.current.deltaDecorations(decorationsRef.current, []);
      decorationsRef.current = [];
    }
  };

  const handleRun = useCallback(() => {
    const start = performance.now();
    setOutput([]);
    setDebugMode(false);
    setVm(null);
    clearDecorations();
    try {
      const tokens = tokenize(activeCode);
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const compiler = new Compiler();
      const program = compiler.compile(ast);
      
      setInstructions(disassemble(program));
      
      const logger = (msg: string) => setOutput(prev => [...prev, msg]);
      const globalEnv = createGlobalEnv(logger);
      const runner = new VM(program, globalEnv, logger);
      runner.run();
      setEnvironment(runner.getEnv());
      setExecTime(performance.now() - start);
    } catch (e: any) {
      setExecTime(0);
      setOutput(prev => [...prev, `[RUNTIME ERROR] ${e.message}`]);
    }
  }, [activeCode]);

  const handleStartDebug = () => {
    setOutput(["Debugging initiated. System paused at IP 0."]);
    setDebugMode(true);
    setExecTime(0);
    clearDecorations();
    try {
      const tokens = tokenize(activeCode);
      const ast = new Parser(tokens).parse();
      const compiler = new Compiler();
      const program = compiler.compile(ast);
      
      setInstructions(disassemble(program));
      
      const logger = (msg: string) => setOutput(prev => [...prev, msg]);
      const globalEnv = createGlobalEnv(logger);
      const newVm = new VM(program, globalEnv, logger);
      setVm(newVm);
      setCurrentIp(0);
      setOperandStack([]);
      setEnvironment(globalEnv);
    } catch (e: any) {
      setOutput(prev => [...prev, `[COMPILE ERROR] ${e.message}`]);
    }
  };

  const handleStep = () => {
    if (!vm || vm.isHalted()) return;
    try {
      vm.step();
      setCurrentIp(vm.getIP());
      setOperandStack(vm.getStack());
      setEnvironment(vm.getEnv());
      
      if (vm.isHalted()) {
        setOutput(prev => [...prev, "Execution halted normally."]);
        setDebugMode(false);
      }
    } catch (e: any) {
      setOutput(prev => [...prev, `[TRAP] ${e.message}`]);
      setDebugMode(false);
      clearDecorations();
    }
  };

  const handleReset = () => {
    setDebugMode(false);
    setVm(null);
    setCurrentIp(-1);
    clearDecorations();
    setOutput(["IDE Reset."]);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Run: Ctrl/Cmd + Enter
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
      // Save: Ctrl/Cmd + S
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSaveFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRun, handleSaveFile]);

  const selectExample = (key: string) => {
    const snippet = ALL_EXAMPLES[key];
    if (snippet) {
      if (activeTab.code.trim() === '' && (activeTab.title === 'main.blocks' || activeTab.title.startsWith('untitled') || activeTab.title === 'Shared Snippet')) {
        updateTabCode(snippet.code);
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, title: snippet.name } : t));
      } else {
        createTab(snippet.code, snippet.name);
      }
      setIsExamplesOpen(false);
      setOutput(prev => [...prev, `Loaded example: ${snippet.name}`]);
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans bg-[#0d1117] text-gray-100 selection:bg-blue-500/30">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleOpenFile} 
        className="hidden" 
        accept=".blk,.blocks,.txt"
      />
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-[#161b22] border-b border-[#30363d] z-20">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg ring-1 ring-white/10">
            <Cpu size={22} className="text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tighter flex items-center gap-2 uppercase">
              Blocks <span className="bg-blue-500/10 text-blue-400 text-[9px] px-2 py-0.5 rounded-full font-mono border border-blue-500/20">{APP_VERSION}</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           {/* File Actions */}
           <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-400 hover:text-white transition-all hover:bg-white/5 rounded-lg" title="Open File">
            <FolderOpen size={16} />
          </button>
           <button onClick={handleSaveFile} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-400 hover:text-white transition-all hover:bg-white/5 rounded-lg mr-2" title="Save File (Cmd+S)">
            <Save size={16} />
          </button>

          <button onClick={handleShare} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-blue-400 hover:text-white transition-all bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg mr-4" title="Share Code">
            <Share2 size={16} /> <span className="hidden sm:inline">Share</span>
          </button>

          {!debugMode ? (
            <>
              <button onClick={() => setIsExamplesOpen(true)} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-xl border border-transparent hover:border-white/10">
                <Menu size={16} /> Examples
              </button>
              <button onClick={() => setIsGuideOpen(true)} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-xl border border-transparent hover:border-white/10">
                <BookOpen size={16} /> Guide
              </button>
              <div className="w-px h-6 bg-[#30363d] mx-2" />
              <button onClick={handleStartDebug} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-orange-400 hover:text-orange-300 transition-all bg-orange-400/10 rounded-xl border border-orange-400/20 hover:border-orange-400/50">
                <Bug size={16} /> Debug
              </button>
              <button 
                onClick={handleRun}
                className="flex items-center gap-2 px-6 py-2.5 font-black text-xs text-white uppercase tracking-widest transition-all bg-blue-600 rounded-xl hover:bg-blue-500 shadow-xl shadow-blue-900/20 active:scale-95 group border border-blue-400/20"
                title="Run (Cmd+Enter)"
              >
                <Play size={16} fill="currentColor" className="group-hover:scale-110 transition-transform" /> Execute
              </button>
            </>
          ) : (
             <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
              <button onClick={handleStep} className="flex items-center gap-2 px-6 py-2.5 font-black text-xs text-blue-400 uppercase tracking-widest transition-all bg-blue-400/10 rounded-xl border border-blue-400/20 hover:bg-blue-400/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <ArrowRight size={16} /> Step
              </button>
              <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-400 hover:text-red-300 transition-all bg-red-400/10 rounded-xl border border-red-400/20">
                <RotateCcw size={16} /> Reset
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex flex-1 overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117] relative">
          
          {/* Tabs Bar */}
          <div className="flex items-center px-2 bg-[#161b22] border-b border-[#30363d] overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <div 
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`
                  group flex items-center gap-2 px-3 py-2.5 text-[11px] font-medium border-r border-[#30363d]/50 cursor-pointer min-w-[120px] max-w-[200px] select-none
                  ${activeTabId === tab.id ? 'bg-[#0d1117] text-blue-400 border-t-2 border-t-blue-500' : 'text-gray-500 hover:bg-[#1f242c] hover:text-gray-300 border-t-2 border-t-transparent'}
                `}
              >
                <FileCode size={14} className={activeTabId === tab.id ? 'text-blue-500' : 'opacity-50'} />
                <span className="truncate flex-1" title={tab.title}>{tab.title}</span>
                {tabs.length > 1 && (
                  <button 
                    onClick={(e) => closeTab(e, tab.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-all"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            <button 
              onClick={() => createTab()} 
              className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg ml-1 transition-colors"
              title="New Tab"
            >
              <Plus size={16} />
            </button>
            
            <div className="ml-auto flex items-center gap-4 px-4">
               {execTime > 0 && <span className="text-green-500/80 lowercase italic font-normal text-[10px] flex items-center gap-1.5 bg-green-500/5 px-2 py-0.5 rounded-full border border-green-500/10">
                <Zap size={10} /> {execTime.toFixed(2)}ms
              </span>}
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden">
             <Editor
               height="100%"
               defaultLanguage="blocks"
               language="blocks"
               value={activeCode}
               onChange={updateTabCode}
               onMount={(editor) => { editorRef.current = editor; }}
               beforeMount={handleEditorWillMount}
               theme="blocks-dark"
               options={{
                 minimap: { enabled: false },
                 fontSize: 14,
                 fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
                 scrollBeyondLastLine: false,
                 automaticLayout: true,
                 padding: { top: 16, bottom: 16 },
                 lineNumbersMinChars: 3,
                 renderLineHighlight: 'all',
                 folding: true,
               }}
             />
          </div>
        </div>

        {/* Sidebar */}
        <Sidebar 
          debugMode={debugMode}
          operandStack={operandStack}
          instructions={instructions}
          currentIp={currentIp}
          output={output}
          environment={environment}
        />
      </main>

      {/* Guide Modal */}
      <Modal 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
        title="Blocks Language Reference"
        icon={BookOpen}
      >
        <div className="space-y-8 text-sm leading-relaxed text-gray-300 p-8 overflow-y-auto h-full custom-scrollbar">
          
          <div className="prose prose-invert max-w-none">
            <p className="text-lg text-gray-300">
              Blocks is a minimalistic, purely functional programming language designed for learning language implementation concepts. 
              It features a tree-walking interpreter, a bytecode compiler, and a virtual machine with Tail Call Optimization (TCO).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-4">
              <h3 className="text-blue-400 font-black flex items-center gap-2 uppercase tracking-widest text-xs border-b border-blue-500/20 pb-2">
                <Terminal size={14} /> Core Syntax
              </h3>
              <ul className="space-y-3 text-gray-400 text-xs font-mono">
                <li className="flex gap-2"><span className="text-pink-400"># Comment</span><span>Lines starting with # are ignored.</span></li>
                <li className="flex gap-2"><span className="text-pink-400">name = val</span><span>Assigns a value to a variable. No keywords.</span></li>
                <li className="flex gap-2"><span className="text-pink-400">0</span><span>Represents False and Nil.</span></li>
                <li className="flex gap-2"><span className="text-pink-400">non-0</span><span>Everything else is True.</span></li>
              </ul>
              <div className="bg-black/40 border border-[#30363d] rounded-xl p-4">
                <pre className="font-mono text-xs text-blue-200 leading-relaxed">
                  x = 10<br/>
                  y = 20<br/>
                  is_valid = x &lt; y  # Returns 1 (True)<br/>
                  nothing = 0     # Acts as Null/False
                </pre>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-orange-400 font-black flex items-center gap-2 uppercase tracking-widest text-xs border-b border-orange-500/20 pb-2">
                <Cpu size={14} /> Operators
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white/5 rounded">
                   <div className="font-bold text-gray-200 mb-1">Math</div>
                   <div className="font-mono text-gray-400">+ - * / %</div>
                </div>
                <div className="p-2 bg-white/5 rounded">
                   <div className="font-bold text-gray-200 mb-1">Logic</div>
                   <div className="font-mono text-gray-400">== &lt; &gt;</div>
                </div>
              </div>
              <div className="bg-black/40 border border-[#30363d] rounded-xl p-4">
                <div className="text-[10px] uppercase text-gray-500 font-bold mb-2">Special String Ops</div>
                <pre className="font-mono text-xs text-orange-200 leading-relaxed">
                  "Hello" + " World"  # Concat<br/>
                  3 - "Hello"         # "lo" (Drop first 3)<br/>
                  "Hello" - 2         # "Hel" (Drop last 2)
                </pre>
              </div>
              <div className="text-[10px] text-gray-500 italic">
                Note: !=, &lt;=, &gt;= are not native. Use logic inversion.
              </div>
            </section>
          </div>

          <section className="space-y-4">
            <h3 className="text-pink-400 font-black flex items-center gap-2 uppercase tracking-widest text-xs border-b border-pink-500/20 pb-2">
              <Layers size={14} /> Blocks (Functions) & Closures
            </h3>
            <p>Functions are called "Blocks". They are values that can be assigned, passed, and returned. They capture their creation environment (Closures).</p>
            <div className="bg-black/40 border border-[#30363d] rounded-xl p-4 flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="text-[10px] uppercase text-gray-500 font-bold mb-2">Definition</div>
                <pre className="font-mono text-xs text-pink-200 leading-relaxed">
                  # [ $params..., body ]<br/>
                  add = [ $a, $b, a + b ]<br/>
                  <br/>
                  # Recursion (Factorial)<br/>
                  fact = [ $n,<br/>
                    if (n &lt; 2) then [1] <br/>
                    else [ n * fact(n-1) ]<br/>
                  ]
                </pre>
              </div>
              <div className="flex-1 border-l border-white/10 pl-6">
                <div className="text-[10px] uppercase text-gray-500 font-bold mb-2">Higher Order</div>
                <pre className="font-mono text-xs text-pink-200 leading-relaxed">
                  # Returning a Block<br/>
                  make_adder = [ $x,<br/>
                    [ $y, x + y ] # Captures x<br/>
                  ]<br/>
                  <br/>
                  add5 = make_adder(5)<br/>
                  print(add5(10)) # 15
                </pre>
              </div>
            </div>
          </section>

          <section className="space-y-4">
             <h3 className="text-green-400 font-black flex items-center gap-2 uppercase tracking-widest text-xs border-b border-green-500/20 pb-2">
                <Zap size={14} /> Control Flow
             </h3>
             <p>Since Blocks is expression-based, `if` statements return values. There are no loops (`for`, `while`). Iteration must be done via recursion.</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/40 border border-[#30363d] rounded-xl p-4">
                  <pre className="font-mono text-xs text-green-200 leading-relaxed">
                    # Syntax<br/>
                    if (condition) <br/>
                    then [ true_value ] <br/>
                    else [ false_value ]
                  </pre>
                </div>
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-xs text-blue-200">
                  <strong>Tail Call Optimization (TCO):</strong><br/>
                  The VM optimizes recursive calls that happen at the end of a block. You can write infinite recursion without overflowing the stack.
                </div>
             </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-purple-400 font-black flex items-center gap-2 uppercase tracking-widest text-xs border-b border-purple-500/20 pb-2">
              <Database size={14} /> Standard Library
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
               <div className="bg-white/5 p-2 rounded"><span className="text-purple-300">print(...args)</span> <span className="text-gray-500 block text-[10px]">Log to output</span></div>
               <div className="bg-white/5 p-2 rounded"><span className="text-purple-300">to_s(val)</span> <span className="text-gray-500 block text-[10px]">Convert to String</span></div>
               <div className="bg-white/5 p-2 rounded"><span className="text-purple-300">to_n(val)</span> <span className="text-gray-500 block text-[10px]">Convert to Number</span></div>
            </div>
          </section>

        </div>
      </Modal>

      {/* Examples Modal (Split View) */}
      <Modal 
        isOpen={isExamplesOpen} 
        onClose={() => setIsExamplesOpen(false)} 
        title="Template Gallery"
        icon={Menu}
        wide={true}
      >
        <div className="flex h-[70vh] min-h-[400px]">
          {/* Sidebar */}
          <div className="w-56 bg-[#0d1117] border-r border-[#30363d] flex flex-col p-2 gap-1 overflow-y-auto">
            {Object.keys(EXAMPLE_CATEGORIES).map(cat => (
              <button
                key={cat}
                onClick={() => setExampleCategory(cat)}
                className={`text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  exampleCategory === cat 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                  : 'text-gray-500 hover:bg-white/5 hover:text-gray-300 border border-transparent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-black/20 custom-scrollbar">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(EXAMPLE_CATEGORIES[exampleCategory] || {}).map(([key, ex]) => (
                  <button
                    key={key}
                    onClick={() => selectExample(key)}
                    className="group p-5 bg-[#161b22] border border-[#30363d] rounded-xl text-left hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex items-start gap-4 shadow-sm hover:shadow-blue-500/5 h-full"
                  >
                    <div className="p-3 bg-white/5 rounded-xl group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-all">
                      <ex.icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="font-bold text-gray-200 group-hover:text-blue-400 transition-colors text-sm">{ex.name}</h4>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-medium line-clamp-2">{ex.description}</p>
                    </div>
                  </button>
                ))}
             </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

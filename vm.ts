
import { OpCode, Program, EvalResult, Closure } from './types';
import { Env } from './interpreter';

// Optimized Runtime Environment
// Locals are stored in a flat array.
// Parent points to the closure's captured environment.
interface RuntimeEnv {
  values: EvalResult[];
  parent: RuntimeEnv | null;
}

interface Frame {
  returnAddr: number;
  env: RuntimeEnv;
}

const STACK_SIZE = 4096;

export class VM {
  private ip: number = 0;
  
  // FLAT STACK IMPLEMENTATION
  private stack: EvalResult[]; 
  private sp: number = 0; // Stack Pointer

  private callStack: Frame[] = [];
  
  private code: Int32Array;
  private pool: any[];
  private sourceMap: number[];
  
  // This is the active local environment (Lexical)
  private env: RuntimeEnv;
  // This is the persistent global environment (Map-based)
  private globalEnv: Env; 
  
  private onPrint: (msg: string) => void;
  private isRunning: boolean = true;

  constructor(program: Program, globalEnv: Env, onPrint: (msg: string) => void) {
    this.code = program.code;
    this.pool = program.pool;
    this.sourceMap = program.sourceMap;
    this.globalEnv = globalEnv;
    this.onPrint = onPrint;
    
    // Pre-allocate Stack
    this.stack = new Array(STACK_SIZE);
    this.sp = 0;

    // Root runtime env (Empty, connects to Globals logically via Opcodes)
    this.env = { values: [], parent: null };
  }

  public getIP(): number { return this.ip; }
  
  public getStack(): EvalResult[] { 
    // Return a slice for UI visualization
    return this.stack.slice(0, this.sp); 
  }
  
  public getEnv(): Env { 
    // This is for UI debugger only.
    // We map the array-based RuntimeEnv back to a Map-based structure purely for display.
    // This is expensive but only runs when stepping/debugging.
    const mapEnv = new Env();
    
    // Copy Globals
    mapEnv.data = { ...this.globalEnv.data };

    // This part is tricky because we lost the names at runtime!
    // The debugger won't show local variable names unless we store debug symbols.
    // For now, we show "LOCALS" as an indexed object.
    
    let curr: RuntimeEnv | null = this.env;
    let depth = 0;
    while(curr) {
      if (curr.values.length > 0) {
        mapEnv.data[`<Scope:${depth}>`] = curr.values.map(v => v) as any;
      }
      curr = curr.parent;
      depth++;
    }

    return mapEnv; 
  }

  public isHalted(): boolean { return !this.isRunning; }

  // Safe Stack Push
  private push(val: EvalResult) {
    if (this.sp >= STACK_SIZE) throw new Error("Stack Overflow");
    this.stack[this.sp++] = val;
  }

  // Safe Stack Pop
  private pop(): EvalResult {
    if (this.sp <= 0) throw new Error("Stack Underflow");
    return this.stack[--this.sp];
  }

  private peek(): EvalResult {
    return this.stack[this.sp - 1];
  }

  public step(): OpCode | null {
    if (!this.isRunning || this.ip >= this.code.length) {
      this.isRunning = false;
      return null;
    }

    // Capture current Op for return
    const op = this.code[this.ip];
    this.executeInstruction();
    return op;
  }

  public run(): EvalResult {
    try {
      while (this.isRunning && this.ip < this.code.length) {
        this.executeInstruction();
      }
      return this.sp > 0 ? this.stack[this.sp - 1] : null;
    } catch (e: any) {
      this.isRunning = false;
      // Map IP back to Source Line
      // We look at the instruction that *caused* the error, which is usually the previous one if IP advanced,
      // or the current one if we are just starting.
      // However, executeInstruction increments IP immediately.
      // So the error likely happened at `this.ip - 1` (the opcode) or during operands fetch.
      // A safe bet is looking up `this.ip - 1`.
      const errorIp = Math.max(0, this.ip - 1);
      const line = this.sourceMap[errorIp] || '?';
      throw new Error(`[Line ${line}] ${e.message}`);
    }
  }

  private executeInstruction() {
    const op = this.code[this.ip++];

    switch (op) {
      case OpCode.PUSH_CONST:
        this.push(this.pool[this.code[this.ip++]]);
        break;

      case OpCode.LOAD_LOCAL: {
        const idx = this.code[this.ip++];
        this.push(this.env.values[idx]);
        break;
      }

      case OpCode.STORE_LOCAL: {
        const idx = this.code[this.ip++];
        const val = this.peek();
        this.env.values[idx] = val;
        break;
      }

      case OpCode.LOAD_UPVALUE: {
        const idx = this.code[this.ip++];
        const hops = this.code[this.ip++];
        let curr: RuntimeEnv | null = this.env;
        for(let i=0; i<hops; i++) {
          curr = curr!.parent;
        }
        if (!curr) throw new Error(`Upvalue lookup failed at depth ${hops}`);
        this.push(curr.values[idx]);
        break;
      }

      case OpCode.STORE_UPVALUE: {
        const idx = this.code[this.ip++];
        const hops = this.code[this.ip++];
        let curr: RuntimeEnv | null = this.env;
        for(let i=0; i<hops; i++) {
          curr = curr!.parent;
        }
        if (!curr) throw new Error(`Upvalue store failed at depth ${hops}`);
        curr.values[idx] = this.peek();
        break;
      }

      case OpCode.LOAD_GLOBAL: {
        const name = this.pool[this.code[this.ip++]];
        this.push(this.globalEnv.get(name));
        break;
      }

      case OpCode.STORE_GLOBAL: {
        const name = this.pool[this.code[this.ip++]];
        const val = this.peek();
        this.globalEnv.set(name, val);
        break;
      }

      case OpCode.BINARY_OP: {
        const opSym = this.pool[this.code[this.ip++]];
        const b = this.pop();
        const a = this.pop();
        
        if (typeof a === 'number' && typeof b === 'number') {
          if (opSym === '+') this.push(a + b);
          else if (opSym === '-') this.push(a - b);
          else if (opSym === '*') this.push(a * b);
          else if (opSym === '/') this.push(Math.floor(a / b));
          else if (opSym === '==') this.push(a === b ? 1 : 0);
          else if (opSym === '>') this.push(a > b ? 1 : 0);
          else if (opSym === '<') this.push(a < b ? 1 : 0);
          else this.push(this.applyBinary(opSym, a, b));
        } else {
          this.push(this.applyBinary(opSym, a, b));
        }
        break;
      }

      case OpCode.JUMP:
        this.ip = this.code[this.ip];
        break;

      case OpCode.JUMP_IF_F: {
        const addr = this.code[this.ip++];
        const val = this.pop();
        if (!this.isTruthy(val)) {
          this.ip = addr;
        }
        break;
      }

      case OpCode.MAKE_BLOCK: {
        const params = this.pool[this.code[this.ip++]];
        const entry = this.code[this.ip++];
        const localsCount = this.code[this.ip++];
        
        this.push({
          type: 'Closure',
          params: params,
          entryAddr: entry,
          localsCount: localsCount,
          env: this.env // Capture current lexical scope
        } as Closure);
        break;
      }

      case OpCode.CALL: 
      case OpCode.TAIL_CALL: {
        const argc = this.code[this.ip++];
        this.performCall(argc, op === OpCode.TAIL_CALL);
        break;
      }

      case OpCode.CALL_IF_CLOSURE:
      case OpCode.TAIL_CALL_IF_CLOSURE: {
        const val = this.pop();
        if (typeof val === 'function' || (val && (val as Closure).type === 'Closure')) {
          this.push(val); 
          this.performCall(0, op === OpCode.TAIL_CALL_IF_CLOSURE);
        } else {
          this.push(val ?? null);
        }
        break;
      }

      case OpCode.RETURN: {
        const frame = this.callStack.pop();
        if (!frame) throw new Error(`Stack underflow: return outside of call`);
        this.ip = frame.returnAddr;
        this.env = frame.env;
        break;
      }

      case OpCode.HALT:
        this.isRunning = false;
        break;

      case OpCode.POP:
        this.pop();
        break;
        
      default:
        throw new Error(`Unknown OpCode: ${op} at index ${this.ip - 1}`);
    }
  }

  private performCall(argc: number, isTail: boolean) {
    // Pop args from stack (LIFO) -> args array
    // Optimization: Read directly from stack relative to SP
    
    // We need to move args to the new environment.
    // For simplicity in this step, we still allocate an args array, 
    // but in a fully optimized VM we would copy stack-to-stack.
    const args: EvalResult[] = new Array(argc);
    for (let i = argc - 1; i >= 0; i--) {
      args[i] = this.pop();
    }
    
    const callable = this.pop();

    if (typeof callable === 'function') {
      const result = callable(...args);
      this.push(result);
    } else if (callable && (callable as Closure).type === 'Closure') {
      const closure = callable as Closure;
      
      if (!isTail) {
        this.callStack.push({ returnAddr: this.ip, env: this.env });
      }

      // Create new Runtime Environment
      // Allocate space for parameters + defined locals
      const newValues = new Array(closure.localsCount); // Fixed size array
      
      // Copy args to first N slots
      for(let i = 0; i < args.length; i++) {
        newValues[i] = args[i] ?? 0;
      }

      // Link Parent
      this.env = {
        values: newValues,
        parent: closure.env
      };
      
      this.ip = closure.entryAddr;
    } else {
      throw new Error(`Target is not callable`);
    }
  }

  private isTruthy(val: EvalResult): boolean {
    return val !== 0 && val !== "" && val !== null && val !== undefined;
  }

  private applyBinary(op: string, a: any, b: any): any {
    if (op === '==') return a === b ? 1 : 0;
    
    const isNumA = typeof a === 'number';
    const isNumB = typeof b === 'number';

    if (isNumA && isNumB) {
      switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': if (b === 0) throw new Error('Div by zero'); return Math.floor(a / b);
        case '%': if (b === 0) throw new Error('Mod by zero'); return a % b;
        case '>': return a > b ? 1 : 0;
        case '<': return a < b ? 1 : 0;
      }
    }

    if (typeof a === 'string' && typeof b === 'string' && op === '+') return a + b;
    if (typeof a === 'string' && typeof b === 'number' && op === '-') return b > 0 ? a.slice(0, -b) : a;
    if (typeof a === 'number' && typeof b === 'string' && op === '-') return b.slice(a);

    throw new Error(`Invalid Op: ${a} ${op} ${b}`);
  }
}

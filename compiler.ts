
import { ASTNode, OpCode, Program } from './types';

interface Local {
  name: string;
  depth: number;
  index: number;
}

interface Scope {
  locals: Local[];
  depth: number;
}

export class Compiler {
  private buffer: number[] = [];
  private pool: any[] = [];
  private sourceMap: number[] = [];
  private scopes: Scope[] = [];
  private currentLine: number = 0;

  constructor() {
    this.reset();
  }

  private reset() {
    this.buffer = [];
    this.pool = [];
    this.sourceMap = [];
    this.currentLine = 0;
    // Root scope (Global simulation for compilation context)
    this.scopes = [{ locals: [], depth: 0 }];
  }

  // Helper to add a literal to the pool and return its index
  private addLiteral(value: any): number {
    const existing = this.pool.indexOf(value);
    if (existing !== -1 && typeof value !== 'object') return existing; 
    this.pool.push(value);
    return this.pool.length - 1;
  }

  public compile(nodes: ASTNode[]): Program {
    this.reset();

    nodes.forEach((node, idx) => {
      this.emitNode(node, false);
      if (idx < nodes.length - 1) {
        this.emit(OpCode.POP);
      }
    });
    this.emit(OpCode.HALT);

    return {
      code: new Int32Array(this.buffer),
      pool: this.pool,
      sourceMap: this.sourceMap
    };
  }

  private emit(op: OpCode, ...args: number[]): number {
    const addr = this.buffer.length;
    this.buffer.push(op);
    this.sourceMap[addr] = this.currentLine; 
    
    for (const arg of args) {
      this.buffer.push(arg);
      this.sourceMap[this.buffer.length - 1] = this.currentLine;
    }
    return addr;
  }

  private patch(addr: number, value: number) {
    this.buffer[addr + 1] = value;
  }

  // Resolves a variable: 
  // 1. Look in current scope -> LOAD_LOCAL
  // 2. Look in parent scopes -> LOAD_UPVALUE
  // 3. Fail -> Assume Global -> LOAD_GLOBAL
  private resolveVar(name: string): { op: OpCode, arg1: number, arg2?: number } {
    // 1. Check Local (current scope)
    const currentScope = this.scopes[this.scopes.length - 1];
    for (let i = currentScope.locals.length - 1; i >= 0; i--) {
      if (currentScope.locals[i].name === name) {
        return { op: OpCode.LOAD_LOCAL, arg1: i };
      }
    }

    // 2. Check Upvalues (parent scopes)
    for (let i = this.scopes.length - 2; i >= 0; i--) {
      const scope = this.scopes[i];
      for (let j = scope.locals.length - 1; j >= 0; j--) {
        if (scope.locals[j].name === name) {
          return { op: OpCode.LOAD_UPVALUE, arg1: j, arg2: (this.scopes.length - 1) - i };
        }
      }
    }

    // 3. Global
    return { op: OpCode.LOAD_GLOBAL, arg1: this.addLiteral(name) };
  }

  private resolveSetVar(name: string): { op: OpCode, arg1: number, arg2?: number } {
    // 1. Check Local (current scope)
    const currentScope = this.scopes[this.scopes.length - 1];
    for (let i = currentScope.locals.length - 1; i >= 0; i--) {
      if (currentScope.locals[i].name === name) {
        return { op: OpCode.STORE_LOCAL, arg1: i };
      }
    }

    // 2. Check Upvalues (parent scopes)
    for (let i = this.scopes.length - 2; i >= 0; i--) {
      const scope = this.scopes[i];
      for (let j = scope.locals.length - 1; j >= 0; j--) {
        if (scope.locals[j].name === name) {
          return { op: OpCode.STORE_UPVALUE, arg1: j, arg2: (this.scopes.length - 1) - i };
        }
      }
    }

    // 3. If we are in the global scope (depth 0), treat as global store
    if (this.scopes.length === 1) {
      return { op: OpCode.STORE_GLOBAL, arg1: this.addLiteral(name) };
    }

    // 4. Implicit Declaration (Shadowing):
    // If inside a block and var doesn't exist, create a new LOCAL in current scope.
    // This effectively makes 'x = 1' behave like 'let x = 1' if x isn't found in parents.
    const index = currentScope.locals.length;
    currentScope.locals.push({ name, depth: currentScope.depth, index });
    return { op: OpCode.STORE_LOCAL, arg1: index };
  }

  private emitNode(node: ASTNode, isTail: boolean = false) {
    this.currentLine = node.line;
    switch (node.type) {
      case 'Int':
        this.emit(OpCode.PUSH_CONST, this.addLiteral(node.value));
        break;
      case 'Str':
        this.emit(OpCode.PUSH_CONST, this.addLiteral(node.value));
        break;
      case 'Var': {
        const { op, arg1, arg2 } = this.resolveVar(node.name);
        if (arg2 !== undefined) this.emit(op, arg1, arg2);
        else this.emit(op, arg1);
        break;
      }
      case 'Assign': {
        // RECURSION SUPPORT:
        // If we are assigning a Block (function), we pre-declare the variable 
        // so that the function body can refer to itself (recursion).
        // For other types (e.g., x = x + 1), we resolve LHS *after* RHS to preserve 
        // intended behavior (reading outer x before shadowing).
        
        if (node.expr.type === 'Block') {
          // Pre-resolve LHS (creates local if needed)
          const { op, arg1, arg2 } = this.resolveSetVar(node.name);
          
          // Compile RHS (function body will now see the new variable)
          this.emitNode(node.expr, false);
          this.currentLine = node.line;
          
          // Emit Store
          if (arg2 !== undefined) this.emit(op, arg1, arg2);
          else this.emit(op, arg1);
          
        } else {
          // Standard assignment: Compile RHS first
          this.emitNode(node.expr, false);
          this.currentLine = node.line;
          
          // Resolve LHS
          const { op, arg1, arg2 } = this.resolveSetVar(node.name);
          if (arg2 !== undefined) this.emit(op, arg1, arg2);
          else this.emit(op, arg1);
        }
        break;
      }
      case 'BinOp':
        this.emitNode(node.left, false);
        this.emitNode(node.right, false);
        this.currentLine = node.line;
        this.emit(OpCode.BINARY_OP, this.addLiteral(node.op));
        break;
      case 'If':
        this.emitNode(node.condition, false);
        this.currentLine = node.line;
        const jumpIfFalseAddr = this.emit(OpCode.JUMP_IF_F, 0); 
        
        this.emitNode(node.thenBranch, false);
        this.currentLine = node.line;
        this.emit(isTail ? OpCode.TAIL_CALL_IF_CLOSURE : OpCode.CALL_IF_CLOSURE);
        const jumpToEndAddr = this.emit(OpCode.JUMP, 0);
        
        this.patch(jumpIfFalseAddr, this.buffer.length);
        this.emitNode(node.elseBranch, false);
        this.currentLine = node.line;
        this.emit(isTail ? OpCode.TAIL_CALL_IF_CLOSURE : OpCode.CALL_IF_CLOSURE);
        
        this.patch(jumpToEndAddr, this.buffer.length);
        break;
      case 'Block': {
        const jumpOverBlock = this.emit(OpCode.JUMP, 0);
        const entryPoint = this.buffer.length;
        
        // --- NEW SCOPE ---
        this.scopes.push({ locals: [], depth: this.scopes.length });
        
        // Register params as locals
        const currentScope = this.scopes[this.scopes.length - 1];
        node.params.forEach((param, i) => {
          currentScope.locals.push({ name: param, depth: currentScope.depth, index: i });
        });

        node.body.forEach((bodyNode, idx) => {
          const isLast = idx === node.body.length - 1;
          this.emitNode(bodyNode, isLast);
          if (!isLast) {
            this.emit(OpCode.POP);
          }
        });
        this.emit(OpCode.RETURN);

        const localsCount = currentScope.locals.length; // Max locals needed
        this.scopes.pop();
        // --- END SCOPE ---
        
        this.patch(jumpOverBlock, this.buffer.length);
        // [OP, ParamsIndex, BodyAddr, LocalsCount]
        this.currentLine = node.line;
        this.emit(OpCode.MAKE_BLOCK, this.addLiteral(node.params), entryPoint, localsCount);
        break;
      }
      case 'Call':
        this.emitNode(node.block, false);
        for (const arg of node.args) {
          this.emitNode(arg, false);
        }
        this.currentLine = node.line;
        this.emit(isTail ? OpCode.TAIL_CALL : OpCode.CALL, node.args.length);
        break;
    }
  }
}

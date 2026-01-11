
import { Token, TokenType, ASTNode, EvalResult, Closure, Program, Instruction, OpCode } from './types';
import { Compiler } from './compiler';
import { VM } from './vm';

const TOKEN_SPECS: { type: TokenType; regex: RegExp }[] = [
  { type: 'COMMENT', regex: /^#.*/ },
  { type: 'WHITESPACE', regex: /^\s+/ },
  { type: 'STRING', regex: /^"[^"]*"/ },
  { type: 'NUMBER', regex: /^-?\d+/ },
  { type: 'ID', regex: /^\$?[a-zA-Z_]\w*/ },
  { type: 'OP', regex: /^(==|[+\-*/%<>])/ },
  { type: 'LBRACK', regex: /^\[/ },
  { type: 'RBRACK', regex: /^\]/ },
  { type: 'LPAREN', regex: /^\(/ },
  { type: 'RPAREN', regex: /^\)/ },
  { type: 'COMMA', regex: /^,/ },
  { type: 'EQ', regex: /^=/ },
];

export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;
  let line = 1;

  while (cursor < src.length) {
    let matched = false;
    const slice = src.slice(cursor);

    for (const spec of TOKEN_SPECS) {
      const match = spec.regex.exec(slice);
      if (match) {
        const val = match[0];
        const newlines = (val.match(/\n/g) || []).length;

        if (spec.type !== 'COMMENT' && spec.type !== 'WHITESPACE') {
          tokens.push({ type: spec.type, value: val, line });
        }
        
        line += newlines;
        cursor += val.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      throw new Error(`Unexpected character at line ${line}: ${src[cursor]}`);
    }
  }
  return tokens;
}

export class Parser {
  private tokens: Token[];
  private i: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek() {
    return this.tokens[this.i] || null;
  }

  private eat(type?: TokenType): Token {
    const token = this.peek();
    if (!token) throw new Error("Unexpected end of input");
    if (type && token.type !== type) {
      throw new Error(`Expected ${type}, got ${token.type} (${token.value}) at line ${token.line}`);
    }
    this.i++;
    return token;
  }

  public parse(): ASTNode[] {
    const statements: ASTNode[] = [];
    while (this.peek()) {
      statements.push(this.statement());
    }
    return statements;
  }

  private statement(): ASTNode {
    return this.expr();
  }

  private expr(): ASTNode {
    const t = this.peek();
    if (!t) throw new Error("Unexpected end of input");
    
    // Assignment: ID = Expr
    if (t.type === 'ID' && this.tokens[this.i + 1]?.type === 'EQ') {
      const idToken = this.eat('ID');
      this.eat('EQ');
      return { type: 'Assign', name: idToken.value, expr: this.expr(), line: idToken.line };
    }

    // If Expression: if (cond) then [body] else [body]
    if (t.type === 'ID' && t.value === 'if') {
      const ifToken = this.eat('ID');
      const condition = this.expr();
      
      // Optional 'then' check (improves error msg)
      const next = this.peek();
      if (next?.type === 'ID' && next.value === 'then') {
        this.eat('ID');
      }
      
      const thenBranch = this.expr();
      
      // Optional 'else' branch
      let elseBranch: ASTNode = { type: 'Int', value: 0, line: ifToken.line };
      const possibleElse = this.peek();
      if (possibleElse?.type === 'ID' && possibleElse.value === 'else') {
        this.eat('ID');
        elseBranch = this.expr();
      }
      
      return { type: 'If', condition, thenBranch, elseBranch, line: ifToken.line };
    }

    let node = this.term();
    while (this.peek() && this.peek()?.type === 'OP') {
      const opToken = this.eat('OP');
      const right = this.term();
      node = { type: 'BinOp', op: opToken.value, left: node, right, line: opToken.line };
    }
    return node;
  }

  private term(): ASTNode {
    const t = this.peek();
    if (!t) throw new Error("Unexpected end of input");

    let node: ASTNode;

    if (t.type === 'LPAREN') {
      this.eat('LPAREN');
      node = this.expr();
      this.eat('RPAREN');
    } else if (t.type === 'NUMBER') {
      const token = this.eat('NUMBER');
      node = { type: 'Int', value: parseInt(token.value, 10), line: token.line };
    } else if (t.type === 'STRING') {
      const token = this.eat('STRING');
      node = { type: 'Str', value: token.value.slice(1, -1), line: token.line };
    } else if (t.type === 'ID') {
      const token = this.eat('ID');
      node = { type: 'Var', name: token.value, line: token.line };
    } else if (t.type === 'LBRACK') {
      const bracketToken = this.eat('LBRACK');
      const params: string[] = [];
      const body: ASTNode[] = [];
      while (this.peek() && this.peek()?.type !== 'RBRACK') {
        const next = this.peek();
        // Check for parameter definition ($param)
        if (next?.type === 'ID' && next.value.startsWith('$')) {
          params.push(this.eat('ID').value.slice(1));
          if (this.peek()?.type === 'COMMA') this.eat('COMMA');
        } else {
          body.push(this.expr());
          if (this.peek()?.type === 'COMMA') this.eat('COMMA');
        }
      }
      this.eat('RBRACK');
      node = { type: 'Block', params, body, line: bracketToken.line };
    } else {
      throw new Error(`Unexpected token ${t.type} (${t.value}) at line ${t.line}`);
    }

    while (this.peek() && this.peek()?.type === 'LPAREN') {
      const openParen = this.eat('LPAREN');
      const args: ASTNode[] = [];
      if (this.peek()?.type !== 'RPAREN') {
        args.push(this.expr());
        while (this.peek()?.type === 'COMMA') {
          this.eat('COMMA');
          args.push(this.expr());
        }
      }
      this.eat('RPAREN');
      node = { type: 'Call', block: node, args, line: openParen.line };
    }

    return node;
  }
}

export class Env {
  public data: Record<string, EvalResult> = {};
  public parent: Env | null;

  constructor(parent: Env | null = null) {
    this.parent = parent;
  }

  public get(key: string): EvalResult {
    let curr: Env | null = this;
    while (curr) {
      if (key in curr.data) return curr.data[key];
      curr = curr.parent;
    }
    throw new Error(`Undefined variable: ${key}`);
  }

  public set(key: string, val: EvalResult) {
    let curr: Env | null = this;
    while (curr) {
      if (key in curr.data) {
        curr.data[key] = val;
        return;
      }
      curr = curr.parent;
    }
    this.data[key] = val;
  }

  public child(): Env {
    return new Env(this);
  }
}

export function createGlobalEnv(onPrint: (msg: string) => void): Env {
  const globalEnv = new Env();
  globalEnv.data['print'] = (...args: any[]) => {
    const strArgs = args.map(a => 
      (a && a.type === 'Closure') ? `<closure params=${a.params}>` : 
      (typeof a === 'function') ? '<native>' : 
      String(a)
    ).join(' ');
    onPrint(strArgs);
    return args[args.length - 1] ?? null;
  };
  globalEnv.data['to_n'] = (s: any) => parseInt(s, 10) || 0;
  globalEnv.data['to_s'] = (n: any) => String(n);
  return globalEnv;
}

// Convert flat bytecode back to readable object format for UI
export function disassemble(program: Program): Instruction[] {
  const instructions: Instruction[] = [];
  const { code, pool, sourceMap } = program;
  let i = 0;

  while (i < code.length) {
    const startIp = i;
    const op = code[i++];
    const line = sourceMap[startIp];
    const instr: Instruction = { op, ip: startIp, line };

    switch (op) {
      case OpCode.PUSH_CONST:
      case OpCode.LOAD_GLOBAL:
      case OpCode.STORE_GLOBAL:
      case OpCode.BINARY_OP:
        instr.arg = pool[code[i++]];
        break;
      case OpCode.LOAD_LOCAL:
      case OpCode.STORE_LOCAL:
        instr.arg = code[i++]; // Stack Index
        break;
      case OpCode.LOAD_UPVALUE:
      case OpCode.STORE_UPVALUE:
        instr.arg = code[i++]; // Index
        instr.arg2 = code[i++]; // Hops
        break;
      case OpCode.JUMP:
      case OpCode.JUMP_IF_F:
        instr.arg = code[i++];
        break;
      case OpCode.MAKE_BLOCK:
        instr.arg = pool[code[i++]]; // params
        instr.arg2 = code[i++];      // entryAddr
        instr.arg3 = code[i++];      // localsCount
        break;
      case OpCode.CALL:
      case OpCode.TAIL_CALL:
        instr.arg = code[i++];
        break;
      case OpCode.CALL_IF_CLOSURE:
      case OpCode.TAIL_CALL_IF_CLOSURE:
      case OpCode.RETURN:
      case OpCode.HALT:
      case OpCode.POP:
        break;
    }
    instructions.push(instr);
  }
  return instructions;
}

export function run(code: string, onPrint: (msg: string) => void): { env: Env, instructions: Instruction[] } {
  const globalEnv = createGlobalEnv(onPrint);
  
  try {
    const tokens = tokenize(code);
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    const compiler = new Compiler();
    const program = compiler.compile(ast);
    
    const vm = new VM(program, globalEnv, onPrint);
    vm.run();

    return { env: globalEnv, instructions: disassemble(program) };
  } catch (err: any) {
    onPrint(`[RUNTIME ERROR] ${err.message}`);
    throw err;
  }
}

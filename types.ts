
export type TokenType = 
  | 'COMMENT' 
  | 'STRING' 
  | 'NUMBER' 
  | 'ID' 
  | 'OP' 
  | 'LBRACK' 
  | 'RBRACK' 
  | 'LPAREN' 
  | 'RPAREN' 
  | 'COMMA' 
  | 'EQ' 
  | 'WHITESPACE';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
}

export type ASTNode =
  | { type: 'Int'; value: number; line: number }
  | { type: 'Str'; value: string; line: number }
  | { type: 'Var'; name: string; line: number }
  | { type: 'Assign'; name: string; expr: ASTNode; line: number }
  | { type: 'Block'; params: string[]; body: ASTNode[]; line: number }
  | { type: 'Call'; block: ASTNode; args: ASTNode[]; line: number }
  | { type: 'BinOp'; op: string; left: ASTNode; right: ASTNode; line: number }
  | { type: 'If'; condition: ASTNode; thenBranch: ASTNode; elseBranch: ASTNode; line: number };

export enum OpCode {
  PUSH_CONST = 0,      // [Op, PoolIndex]
  
  // Lexical Addressing
  LOAD_LOCAL = 1,      // [Op, StackIndex]
  STORE_LOCAL = 2,     // [Op, StackIndex]
  LOAD_GLOBAL = 3,     // [Op, PoolIndex(Name)]
  STORE_GLOBAL = 4,    // [Op, PoolIndex(Name)]
  LOAD_UPVALUE = 5,    // [Op, UpvalueIndex, Hops]
  STORE_UPVALUE = 6,   // [Op, UpvalueIndex, Hops]

  BINARY_OP = 7,       // [Op, PoolIndex]
  JUMP = 8,            // [Op, Address]
  JUMP_IF_F = 9,       // [Op, Address]
  MAKE_BLOCK = 10,     // [Op, PoolIndex(Params), Address, LocalsCount]
  CALL = 11,           // [Op, ArgC]
  TAIL_CALL = 12,      // [Op, ArgC]
  RETURN = 13,         // [Op]
  HALT = 14,           // [Op]
  POP = 15,            // [Op]
  CALL_IF_CLOSURE = 16, // [Op]
  TAIL_CALL_IF_CLOSURE = 17 // [Op]
}

// Optimized Program Structure
export interface Program {
  code: Int32Array;      // The flat bytecode
  pool: any[];           // Literals (strings, numbers, param arrays)
  sourceMap: number[];   // Index -> Line Number mapping (sparse or parallel)
}

// For UI Visualization only
export interface Instruction {
  op: OpCode;
  arg?: any;
  arg2?: any;
  arg3?: any;
  line?: number;
  ip: number; // The actual address in the Int32Array
}

export interface Closure {
  type: 'Closure';
  params: string[];
  entryAddr: number;
  env: any; // Now an optimized runtime environment (Array)
  localsCount: number; // How many local slots to allocate
}

export type EvalResult = number | string | Closure | Function | null;


import { BrainCircuit, Aperture } from 'lucide-react';

export const EXAMPLES_SHOWCASE = {
  'showcase/brainfuck.blk': {
    name: "Brainfuck Interpreter",
    icon: BrainCircuit,
    description: "A Turing-complete interpreter parsing ASTs.",
    code: `# Brainfuck Interpreter in Blocks
# 1. Parses raw string into a Nested AST
# 2. Executes the AST recursively on a Tape Zipper

# --- List & String Tools ---
cons = [ $h, $t, [ $s, if (s=="h") then [h] else [t] ] ]
head = [ $l, l("h") ]
tail = [ $l, l("t") ]
nil = 0

len_rec = [ $s, $n, if (s == "") then [n] else [len_rec(1 - s, n + 1)] ]
first = [ $s, s - (len_rec(s, 0) - 1) ]
str_to_list = [ $s, if (s == "") then [nil] else [cons(first(s), str_to_list(1 - s))] ]

# --- Parsing (Recursive Descent) ---
# Returns: cons(parsed_nodes_list, remaining_tokens_list)
parse_wrapped = [ $toks,
  if (toks == nil) then [ cons(nil, cons(nil, nil)) ] else [
    t = head(toks)
    rem = tail(toks)
    
    if (t == "]") then [ 
       # End of current block, return (nil, rem)
       cons(nil, cons(rem, nil)) 
    ] else [
      if (t == "[") then [
         # Loop start: Parse body recursively
         res = parse_wrapped(rem)
         body = head(res)
         after_loop = head(tail(res))
         
         # Parse rest of this block
         rest_res = parse_wrapped(after_loop)
         
         # Node: cons("LOOP", body)
         node = cons("LOOP", cons(body, nil))
         
         # Combine
         cons(cons(node, head(rest_res)), cons(head(tail(rest_res)), nil))
      ] else [
         # Operation: Parse rest
         res = parse_wrapped(rem)
         
         # Node: cons("OP", op_char)
         node = cons("OP", cons(t, nil))
         
         cons(cons(node, head(res)), cons(head(tail(res)), nil))
      ]
    ]
  ]
]

# --- Tape Logic (Zipper) ---
# Structure: cons(left_stack, cons(current_val, cons(right_stack, nil)))
make_tape = [ cons(nil, cons(0, cons(nil, nil))) ]
val = [ $t, head(tail(t)) ]
set = [ $t, $v, cons(head(t), cons(v, tail(tail(t)))) ]

move_r = [ $t,
  l = head(t)
  v = head(tail(t))
  r = head(tail(tail(t)))
  # Push v to left, pop from right
  cons(cons(v, l), cons(if (r == nil) then [0] else [head(r)], cons(if (r == nil) then [nil] else [tail(r)], nil)))
]

move_l = [ $t,
  l = head(t)
  v = head(tail(t))
  r = head(tail(tail(t)))
  # Push v to right, pop from left
  cons(if (l == nil) then [nil] else [tail(l)], cons(if (l == nil) then [0] else [head(l)], cons(cons(v, r), nil)))
]

# --- Execution ---
exec = [ $ast, $tape,
  if (ast == nil) then [ tape ] else [
    node = head(ast)
    type = head(node)
    payload = head(tail(node))
    rest = tail(ast)
    
    if (type == "OP") then [
       cmd = payload
       # Apply Op
       new_tape = if (cmd == "+") then [ set(tape, val(tape) + 1) ] else [
                  if (cmd == "-") then [ set(tape, val(tape) - 1) ] else [
                  if (cmd == ">") then [ move_r(tape) ] else [
                  if (cmd == "<") then [ move_l(tape) ] else [
                  if (cmd == ".") then [ print(val(tape)) tape ] else [ tape ]]]]]
       exec(rest, new_tape)
    ] else [
       # LOOP
       body = payload
       # Define recursive loop runner
       run_loop = [ $tp,
         if (val(tp) == 0) then [ tp ] else [
            run_loop(exec(body, tp))
         ]
       ]
       exec(rest, run_loop(tape))
    ]
  ]
]

# --- Main ---
run_bf = [ $code,
  tokens = str_to_list(code)
  # Wrap parse result: head(parse(...)) gets the AST list
  ast = head(parse_wrapped(tokens))
  print("Running BF Code...")
  exec(ast, make_tape())
]

# Program: "Hello World!"
# (Shortened version for speed)
code = "++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++."
run_bf(code)`
  },
  'showcase/mandelbrot.blk': {
    name: "ASCII Mandelbrot",
    icon: Aperture,
    description: "Fixed-point arithmetic generating fractals.",
    code: `# Mandelbrot Set Renderer
# Uses Fixed-Point Math (1000 = 1.0) since we only have integers.

cols = 50
rows = 24
max_iter = 20
scale = 1000

# Fixed Point Multiply: (a * b) / scale
mul = [ $a, $b, (a * b) / scale ]

# Map Screen X to Real (-2.5 to 1.0)
to_r = [ $x, ((x * 3500) / cols) - 2500 ]

# Map Screen Y to Imaginary (-1.0 to 1.0)
to_i = [ $y, ((y * 2000) / rows) - 1000 ]

# Main Iterator z = z^2 + c
iter = [ $zr, $zi, $cr, $ci, $n,
  if (n == 0) then [ 0 ] else [
    zr2 = mul(zr, zr)
    zi2 = mul(zi, zi)
    
    # Divergence check: |z|^2 > 4.0
    if ((zr2 + zi2) > (4 * scale)) then [ 0 ] else [
       # zr_new = zr^2 - zi^2 + cr
       # zi_new = 2*zr*zi + ci
       new_zr = (zr2 - zi2) + cr
       new_zi = mul(2 * scale, mul(zr, zi)) + ci
       
       1 + iter(new_zr, new_zi, cr, ci, n - 1)
    ]
  ]
]

# Character shader
get_char = [ $i,
   if (i < 2) then [" "] else [
   if (i < 5) then ["."] else [
   if (i < 10) then ["+"] else [
   if (i < 18) then ["*"] else ["@"]]]]
]

# Render Loop
print("Rendering Mandelbrot Set...")

row_loop = [ $y,
  if (y == rows) then [ 0 ] else [
    
    # Render one line
    col_loop = [ $x, $line,
       if (x == cols) then [ line ] else [
          cr = to_r(x)
          ci = to_i(y)
          iters = iter(0, 0, cr, ci, max_iter)
          col_loop(x + 1, line + get_char(iters))
       ]
    ]
    
    print(col_loop(0, ""))
    row_loop(y + 1)
  ]
]

row_loop(0)`
  }
};

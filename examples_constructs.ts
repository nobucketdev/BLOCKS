
import { Filter, WrapText, Waves, GitMerge } from 'lucide-react';

export const EXAMPLES_CONSTRUCTS = {
  'patterns/map_filter.blk': {
    name: "Map & Filter",
    icon: Filter,
    description: "Higher-order functions processing lists.",
    code: `# Functional List Processing
# Standard Cons Cell Implementation
cons = [ $h, $t, [ $sel, if (sel=="h") then [h] else [t] ] ]
head = [ $l, l("h") ]
tail = [ $l, l("t") ]
nil = 0

# MAP: Apply fn to every element
map = [ $l, $fn,
  if (l == nil) then [ nil ] else [
    cons(fn(head(l)), map(tail(l), fn))
  ]
]

# FILTER: Keep elements where pred(x) is true
filter = [ $l, $pred,
  if (l == nil) then [ nil ] else [
    h = head(l)
    rest = filter(tail(l), pred)
    if (pred(h)) then [ cons(h, rest) ] else [ rest ]
  ]
]

# Helper: Range 1..N
range = [ $s, $e, if (s > e) then [nil] else [cons(s, range(s+1, e))] ]

# Helper: Print List
p_list = [ $l, if (l==nil) then [0] else [print(head(l)), p_list(tail(l))] ]

# --- Execution ---
nums = range(1, 10)

print("Squared Evens:")
# Chain: Filter Evens -> Map Square
evens = filter(nums, [ $x, (x % 2) == 0 ])
squares = map(evens, [ $x, x * x ])

p_list(squares)`
  },
  'patterns/currying.blk': {
    name: "Currying",
    icon: GitMerge,
    description: "Partial application of functions.",
    code: `# Currying & Partial Application
# Functions returning functions to lock in state.

# A generic adder generator
add_n = [ $n, 
  [ $x, x + n ]
]

add_5 = add_n(5)
add_10 = add_n(10)

print("5 + 10 =", add_5(10))
print("10 + 20 =", add_10(20))

# Configurable Logger Example
logger = [ $prefix,
  [ $msg, print(prefix + ": " + msg) ]
]

info = logger("[INFO]")
err = logger("[ERROR]")

info("System started")
err("Connection failed")`
  },
  'patterns/streams.blk': {
    name: "Lazy Streams",
    icon: Waves,
    description: "Infinite data structures using Thunks.",
    code: `# Lazy Evaluation (Infinite Streams)
# A stream is a head and a THUNK (a function) for the tail.

# cons_stream(value, func_returning_next)
cons_s = [ $h, $thunk, 
  [ $sel, if (sel=="h") then [h] else [thunk] ] 
]
head = [ $s, s("h") ]
# Force the thunk by calling it with dummy 0
tail = [ $s, (s("t"))(0) ] 

# Infinite stream of Integers: 1, 2, 3...
# Note: We pass a block for the tail, not a value!
ints = [ $n, 
  cons_s(n, [ $d, ints(n + 1) ]) 
]

# Infinite stream of Fibonacci numbers
fibs = [ $a, $b,
  cons_s(a, [ $d, fibs(b, a + b) ])
]

# Take first N elements
take = [ $n, $s,
  if (n == 0) then [ 0 ] else [
    print(head(s))
    take(n - 1, tail(s))
  ]
]

print("--- Infinite Integers ---")
natural_numbers = ints(1)
take(5, natural_numbers)

print("--- Infinite Fibonacci ---")
fib_stream = fibs(0, 1)
take(10, fib_stream)`
  },
  'patterns/pipeline.blk': {
    name: "Pipeline",
    icon: WrapText,
    description: "Composing data transformations.",
    code: `# Function Composition / Pipelining
# x |> f |> g is equivalent to g(f(x))

# Apply a value to a list of functions in order
pipe = [ $val, $fns,
  if (fns == 0) then [ val ] else [
    fn = head(fns)
    pipe(fn(val), tail(fns))
  ]
]

# --- List Lib ---
cons = [ $h, $t, [ $s, if (s=="h") then [h] else [t] ] ]
head = [ $l, l("h") ]
tail = [ $l, l("t") ]

# --- Operations ---
double = [ $x, x * 2 ]
inc = [ $x, x + 1 ]
exclaim = [ $x, to_s(x) + "!" ]

# Build Pipeline: x -> double -> inc -> exclaim
pipeline = cons(double, cons(inc, cons(exclaim, 0)))

result = pipe(10, pipeline)
print("Result of 10 |> *2 |> +1 |> str:", result)`
  }
};

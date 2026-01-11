
import { ArrowDownUp, LayoutGrid, Combine, Activity, Hexagon, TowerControl } from 'lucide-react';

export const EXAMPLES_ALGO = {
  'algo/quicksort.blk': {
    name: "Quicksort",
    icon: ArrowDownUp,
    description: "Functional Quicksort using filter.",
    code: `# Functional Quicksort
# Elegant O(n log n) sorting using list filtering.

# --- List Lib ---
cons = [ $h, $t, [ $s, if (s=="h") then [h] else [t] ] ]
head = [ $l, l("h") ]
tail = [ $l, l("t") ]
nil = 0

# --- Helpers ---
append = [ $l1, $l2, 
  if (l1 == nil) then [l2] else [cons(head(l1), append(tail(l1), l2))]
]

filter = [ $l, $p,
  if (l == nil) then [nil] else [
    h = head(l)
    t = tail(l)
    if (p(h)) then [cons(h, filter(t, p))] else [filter(t, p)]
  ]
]

# --- Quicksort ---
qsort = [ $l,
  if (l == nil) then [ nil ] else [
    pivot = head(l)
    rest = tail(l)
    
    # Partition
    less = filter(rest, [ $x, x < pivot ])
    # x >= pivot is logically equivalent to !(x < pivot)
    # Since we don't have >= or !, we use if/else to invert
    more = filter(rest, [ $x, if (x < pivot) then [0] else [1] ])
    
    # Recurse and Combine: sort(less) + pivot + sort(more)
    append(qsort(less), cons(pivot, qsort(more)))
  ]
]

# Print helper
# Check if list is empty (nil) instead of checking if it is NOT empty (!=)
p_list = [ $l, if (l==0) then [0] else [print(head(l)), p_list(tail(l))] ]

# Test
list = cons(5, cons(2, cons(9, cons(1, cons(5, 0)))))
print("Sorting [5, 2, 9, 1, 5]...")
sorted = qsort(list)
p_list(sorted)`
  },
  'algo/fib_dp.blk': {
    name: "DP: Fibonacci",
    icon: Activity,
    description: "O(n) Fibonacci using iterative state passing.",
    code: `# Bottom-Up Dynamic Programming approach
# Instead of recalculating, we pass the state forward.

fib_iter = [ $n, $a, $b,
  if (n == 0) then [
    a
  ] else [
    # State transition: a -> b, b -> a+b
    fib_iter(n - 1, b, a + b)
  ]
]

fib = [ $n, fib_iter(n, 0, 1) ]

print("Fib(10):", fib(10))
print("Fib(50):", fib(50))
print("Fib(70):", fib(70))`
  },
  'algo/primes.blk': {
    name: "Sieve of Eratosthenes",
    icon: Hexagon,
    description: "Generating primes using functional list filtering.",
    code: `# Sieve of Eratosthenes
# Generating prime numbers by filtering non-primes.

# --- List Lib ---
cons = [ $h, $t, [ $s, if (s=="h") then [h] else [t] ] ]
head = [ $l, l("h") ]
tail = [ $l, l("t") ]
nil = 0

# --- Standard Filter ---
filter = [ $l, $pred,
  if (l == nil) then [ nil ] else [
    h = head(l)
    rest = filter(tail(l), pred)
    if (pred(h)) then [ cons(h, rest) ] else [ rest ]
  ]
]

# --- Range Generator ---
range = [ $s, $e, if (s > e) then [nil] else [cons(s, range(s+1, e))] ]

# --- Sieve Logic ---
sieve = [ $l,
  if (l == nil) then [ nil ] else [
    p = head(l)
    xs = tail(l)
    
    # Filter out all numbers divisible by p
    # Logic: x % p returns 0 (False) if divisible, >0 (True) if not.
    # This effectively filters OUT numbers where x is divisible by p.
    remaining = filter(xs, [ $x, x % p ])
    
    cons(p, sieve(remaining))
  ]
]

# Helper to print list
p_list = [ $l, if (l==nil) then [0] else [print(head(l)), p_list(tail(l))] ]

# Generate primes up to 50
print("Primes up to 50:")
nums = range(2, 50)
primes = sieve(nums)
p_list(primes)`
  },
  'algo/hanoi.blk': {
    name: "Towers of Hanoi",
    icon: TowerControl,
    description: "Classic recursion visualizer.",
    code: `# Towers of Hanoi
# A recursive solution to moving N disks from Source to Dest.

hanoi = [ $n, $src, $dest, $aux,
  if (n == 1) then [
    print("Move disk 1 from", src, "to", dest)
  ] else [
    # Move N-1 from Src to Aux
    hanoi(n - 1, src, aux, dest)
    
    # Move largest disk from Src to Dest
    print("Move disk", n, "from", src, "to", dest)
    
    # Move N-1 from Aux to Dest
    hanoi(n - 1, aux, dest, src)
  ]
]

print("Solving for 3 disks:")
hanoi(3, "A", "C", "B")`
  },
  'algo/grid_paths.blk': {
    name: "DP: Grid Paths",
    icon: LayoutGrid,
    description: "Counting paths in a grid using row-by-row state.",
    code: `# Unique Paths in NxM Grid (Bottom-Up)
# DP Relation: cell[col] = cell[col] + cell[col-1]

cons = [ $h, $t, [ $c, if (c=="h") then [h] else [t] ] ]
head = [ $l, l("h") ]
tail = [ $l, l("t") ]
nil = 0

calc_next_row = [ $prev, $left,
  if (prev == nil) then [ nil ] else [
    up = head(prev)
    current = left + up
    cons(current, calc_next_row(tail(prev), current))
  ]
]

make_row = [ $len, if (len == 0) then [nil] else [cons(1, make_row(len - 1))] ]

last = [ $l,
  t = tail(l),
  if (t == nil) then [ head(l) ] else [ last(t) ]
]

count_paths = [ $rows, $cols,
  init_row = make_row(cols),
  loop = [ $r, $current_row,
    if (r == 1) then [ last(current_row) ] else [
       next = calc_next_row(current_row, 0),
       loop(r - 1, next)
    ]
  ],
  loop(rows, init_row)
]

print("Paths in 3x3:", count_paths(3, 3))
print("Paths in 10x10:", count_paths(10, 10))`
  },
  'algo/lcs.blk': {
    name: "DP: LCS",
    icon: Combine,
    description: "Longest Common Subsequence using 2D DP.",
    code: `# Longest Common Subsequence (LCS)
# Demonstrates: Manual String Ops & 2D DP

# --- Core Lib ---
cons = [ $h, $t, [ $c, if (c=="h") then [h] else [t] ] ]
head = [ $l, l("h") ]
tail = [ $l, l("t") ]
nil = 0

zeros = [ $n, if (n == 0) then [ nil ] else [ cons(0, zeros(n - 1)) ] ]
max = [ $a, $b, if (a > b) then [a] else [b] ]

# --- String Polyfills ---
# Recursive Length: len("abc") = 1 + len("bc")
len_rec = [ $s, $acc, if (s == "") then [acc] else [len_rec(1 - s, acc + 1)] ]
len = [ $s, len_rec(s, 0) ]

# First Char: s - (len(s) - 1) drops last N-1 chars, leaving 1
head_s = [ $s, s - (len(s) - 1) ]

# --- LCS Logic ---
# Iterates through s2 substring ($s2_rem) instead of index
calc = [ $p_row, $s1_c, $s2_rem, $left,
  if (s2_rem == "") then [ nil ] else [
     diag = head(p_row)
     up   = head(tail(p_row))
     
     s2_c = head_s(s2_rem)
     match = if (s1_c == s2_c) then [1] else [0]
     
     val = if (match) then [ diag + 1 ] else [ max(up, left) ]
     cons(val, calc(tail(p_row), s1_c, 1 - s2_rem, val))
  ]
]

lcs = [ $s1, $s2,
  w = len(s2)
  row = zeros(w),
  
  # Inner functions can now capture themselves (recursion)
  # without forward declaration thanks to compiler update.
  get_last = [ $l, if (tail(l) == nil) then [head(l)] else [get_last(tail(l))] ],

  solve = [ $s1_rem, $prev,
    if (s1_rem == "") then [ 
       get_last(prev)
    ] else [
       c = head_s(s1_rem),
       padded_prev = cons(0, prev),
       # Pass s2 (full string) to calc
       next = calc(padded_prev, c, s2, 0),
       solve(1 - s1_rem, next)
    ]
  ],
  solve(s1, row)
]

s1 = "STONE"
s2 = "LONGEST"
print("LCS of", s1, "and", s2, "is", lcs(s1, s2))`
  }
};

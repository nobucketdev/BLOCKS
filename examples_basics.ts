
import { Terminal, Calculator, Type, Binary, Repeat } from 'lucide-react';

export const EXAMPLES_BASICS = {
  'basics/intro.blk': {
    name: "Intro: Hello World",
    icon: Terminal,
    description: "Variables, Math, and basic Output.",
    code: `# Welcome to Blocks!
# A functional language where everything is an expression.

# 1. Variables (No 'var' keyword needed)
name = "Blocks"
ver = 1

# 2. Output
print("Hello from", name, "v" + to_s(ver))

# 3. Simple Math
x = 10
y = 20
print("Sum:", x + y)

# 4. Expressions
is_big = if (x > 5) then [ "Yes" ] else [ "No" ]
print("Is 10 big?", is_big)`
  },
  'basics/types.blk': {
    name: "Data Types & Logic",
    icon: Binary,
    description: "Ints, Strings, Booleans (0/1), and Blocks.",
    code: `# Data Types in Blocks
# Everything is a value.

# 1. Integers
num = 42
neg = -10
math = (num + neg) * 2
print("Math Result:", math)

# 2. Strings
greeting = "Hello"
target = "World"
msg = greeting + " " + target
print(msg)

# 3. Booleans
# There is no true/false keyword.
# 0 is False/Nil. Anything else is True.
is_true = 1
is_false = 0
check = if (10 > 5) then ["Big"] else ["Small"]
print("10 > 5 is", check)

# 4. Logic Operators return 1 or 0
print("5 == 5 is", 5 == 5)
print("5 < 3 is", 5 < 3)

# 5. Blocks (Functions)
# Blocks are first-class values.
double = [ $x, x * 2 ]
print("Double 10:", double(10))`
  },
  'basics/loops.blk': {
    name: "Loops (Recursion)",
    icon: Repeat,
    description: "Simulating 'for' and 'while' loops.",
    code: `# Iteration via Recursion
# Blocks has no 'for' or 'while' keywords.
# We use recursive functions to loop.

# 1. Simulating a 'for' loop (0 to N)
# print_range(0, 5)
print_range = [ $current, $max,
  if (current > max) then [
    0 # Done
  ] else [
    print("For Loop Index:", current)
    print_range(current + 1, max)
  ]
]

print("--- Counting to 3 ---")
print_range(1, 3)

# 2. Simulating a 'while' loop
# Note: We pass the state 'n' to the next iteration.
countdown = [ $n,
  if (n == 0) then [
    print("Liftoff!")
  ] else [
    print("T-minus", n)
    countdown(n - 1)
  ]
]

print("--- While (Countdown) ---")
countdown(5)`
  },
  'basics/factorial.blk': {
    name: "Recursion: Factorial",
    icon: Calculator,
    description: "The 'Hello World' of Functional Programming.",
    code: `# Recursive Logic
# Functions (Blocks) are defined with [ $param, body ]

fact = [ $n,
  if (n < 2) then [ 
    1 
  ] else [ 
    n * fact(n - 1) 
  ]
]

print("Factorial of 5:", fact(5))
print("Factorial of 10:", fact(10))`
  },
  'basics/strings.blk': {
    name: "Strings & Logic",
    icon: Type,
    description: "Unique string subtraction operators.",
    code: `# String Processing Showcase
# "String" - N  => Drops last N characters
# N - "String"  => Drops first N characters

url = "https://gemini.google.com"
print("Original:", url)

# Extract Protocol
# 8 - url drops first 8 chars ("https://")
domain_path = 8 - url
print("Strip Protocol:", domain_path)

# Extract Domain Name
# domain_path - 4 drops last 4 chars (".com")
name = domain_path - 4
print("Strip TLD:", name)

# Reassemble
new_url = "ftp://" + name + ".org"
print("Reassembled:", new_url)`
  }
};

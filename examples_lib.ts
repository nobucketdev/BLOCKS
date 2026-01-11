
import { ListTree, Package, Hexagon, List } from 'lucide-react';

export const EXAMPLES_LIB = {
  'structures/list.blk': {
    name: "Linked List",
    icon: List,
    description: "Building a List data structure from scratch.",
    code: `# Constructing a List Primitive (Cons Cell)
# A list is either 0 (nil) or a pair of (head, tail)

cons = [ $h, $t, [ $sel, if (sel=="h") then [h] else [t] ] ]
head = [ $l, l("h") ]
tail = [ $l, l("t") ]
nil = 0

# Helper: Print all elements
print_list = [ $l,
  if (l == nil) then [ 0 ] else [
    print("Item:", head(l))
    print_list(tail(l))
  ]
]

# Create [10, 20, 30]
my_list = cons(10, cons(20, cons(30, nil)))

print("Traversing List:")
print_list(my_list)`
  },
  'structures/object.blk': {
    name: "Object (OOP)",
    icon: Package,
    description: "Creating an Object with methods using Closures.",
    code: `# Constructing an Object
# Objects are closures that dispatch on a message string.

create_person = [ $name, $age,
  # This inner block is the "Instance"
  [ $msg, $arg,
    if (msg == "info") then [
       name + " is " + to_s(age) + " years old."
    ] else [
    if (msg == "greet") then [
       "Hello " + arg + ", I am " + name
    ] else [
    if (msg == "birthday") then [
       # Return a NEW object with updated state (Immutability)
       create_person(name, age + 1)
    ] else [ 0 ]]]
  ]
]

p1 = create_person("Alice", 25)
print(p1("info", 0))

print(p1("greet", "Bob"))

# State update pattern
p2 = p1("birthday", 0)
print("After birthday:", p2("info", 0))`
  },
  'structures/tree.blk': {
    name: "Binary Tree",
    icon: ListTree,
    description: "Recursive data structure with getters/setters.",
    code: `# Binary Search Tree Node
make_node = [ $val,
    left = 0,
    right = 0,
    # Dispatcher
    [ $cmd, $arg,
        if (cmd == "val") then [ val ] else [
        if (cmd == "left") then [ left ] else [
        if (cmd == "right") then [ right ] else [
        if (cmd == "set_l") then [ left = arg ] else [
        if (cmd == "set_r") then [ right = arg ]
        ]]]]
    ]
]

insert = [ $root, $v,
    curr = root("val", 0)
    if (v < curr) then [
        l = root("left", 0)
        if (l == 0) then [ root("set_l", make_node(v)) ] else [ insert(l, v) ]
    ] else [
        r = root("right", 0)
        if (r == 0) then [ root("set_r", make_node(v)) ] else [ insert(r, v) ]
    ]
]

# Usage
root = make_node(50)
insert(root, 30)
insert(root, 70)
insert(root, 20)

print("Root:", root("val", 0))
l = root("left", 0)
print("L:", l("val", 0))
print("L->L:", l("left", 0)("val", 0))`
  },
  'structures/vector.blk': {
    name: "Vector2D",
    icon: Hexagon,
    description: "Immutable Vector Math class.",
    code: `# Vector2D "Class" (Immutable)
vec2 = [ $x, $y,
  [ $msg, $arg,
    if (msg == "x") then [ x ] else [
    if (msg == "y") then [ y ] else [
    if (msg == "add") then [
       nx = x + arg("x", 0)
       ny = y + arg("y", 0)
       vec2(nx, ny)
    ] else [
    if (msg == "str") then [
       "(" + to_s(x) + "," + to_s(y) + ")"
    ] else [ 0 ]]]]
  ]
]

v1 = vec2(10, 5)
v2 = vec2(20, 10)
v3 = v1("add", v2)

print("v1:", v1("str", 0))
print("v2:", v2("str", 0))
print("v3:", v3("str", 0))`
  }
};

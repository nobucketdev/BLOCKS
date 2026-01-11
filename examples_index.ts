
import { EXAMPLES_BASICS } from './examples_basics';
import { EXAMPLES_CONSTRUCTS } from './examples_constructs';
import { EXAMPLES_ALGO } from './examples_algo';
import { EXAMPLES_LIB } from './examples_lib';
import { EXAMPLES_SHOWCASE } from './examples_showcase';

export interface Example {
  name: string;
  code: string;
  icon: any;
  description: string;
}

export const EXAMPLE_CATEGORIES: Record<string, Record<string, Example>> = {
  "Essentials": EXAMPLES_BASICS,
  "Functional Patterns": EXAMPLES_CONSTRUCTS,
  "Data Modeling": EXAMPLES_LIB,
  "Algorithms": EXAMPLES_ALGO,
  "Showcase": EXAMPLES_SHOWCASE,
};

// Flat map for direct access if needed
export const ALL_EXAMPLES = {
  ...EXAMPLES_BASICS,
  ...EXAMPLES_CONSTRUCTS,
  ...EXAMPLES_ALGO,
  ...EXAMPLES_LIB,
  ...EXAMPLES_SHOWCASE
};

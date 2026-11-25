/**
 * Guard against "Text strings must be rendered within a <Text> component".
 *
 * React Native crashes (red box in dev, broken screen in release) when a string ends up as a
 * direct child of a View-like element. Two ways this happens in source, both caught here by
 * parsing every .tsx file with the TypeScript compiler:
 *
 *  1. Same-line whitespace between JSX children, e.g. `<View>   {list}`. JSX drops whitespace
 *     that contains a line break, but whitespace on ONE line is kept as a " " string child.
 *  2. Literal words directly inside a layout element, e.g. `<View>Hello</View>`.
 *
 * Elements that wrap their children in <Text> themselves are allowed (TEXT_WRAPPERS).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/** Elements whose children are rendered inside a <Text> (strings are fine there). */
const TEXT_WRAPPERS = new Set(['Text', 'Animated.Text', 'TextInput', 'SectionLabel', 'Point', 'Trans']);

const SRC = join(__dirname, '..');

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) tsxFiles(full, out);
    else if (name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

function findProblems(file: string, source: string): string[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const problems: string[] = [];
  const where = (node: ts.Node) => `${relative(SRC, file)}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`;

  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node)) {
      const tag = node.openingElement.tagName.getText(sf);
      if (!TEXT_WRAPPERS.has(tag)) {
        for (const child of node.children) {
          if (!ts.isJsxText(child)) continue;
          if (child.containsOnlyTriviaWhiteSpaces) continue; // has a line break: dropped by JSX
          const kind = child.text.trim() === '' ? 'same-line whitespace' : `text "${child.text.trim().slice(0, 40)}"`;
          problems.push(`${where(child)} ${kind} directly inside <${tag}>`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return problems;
}

describe('JSX text placement', () => {
  it('detects the two failure patterns (self-check)', () => {
    expect(findProblems('a.tsx', '<View>        {items}\n</View>')).toHaveLength(1);
    expect(findProblems('a.tsx', '<View>Hello</View>')).toHaveLength(1);
    expect(findProblems('a.tsx', '<View>\n  {items}\n</View>')).toHaveLength(0);
    expect(findProblems('a.tsx', '<Text>Hello {name}</Text>')).toHaveLength(0);
  });

  it('no string is rendered outside a <Text> anywhere in src', () => {
    const files = tsxFiles(SRC);
    expect(files.length).toBeGreaterThan(20);
    const problems = files.flatMap((f) => findProblems(f, readFileSync(f, 'utf8')));
    expect(problems).toEqual([]);
  });
});

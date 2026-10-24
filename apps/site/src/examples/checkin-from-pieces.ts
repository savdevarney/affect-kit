// Reference implementation: a check-in built from affect-kit's pieces alone,
// with no <affect-kit-rater>. It behaves like the rater, so an app with its own
// screens (or native views) can follow it step by step.
//
//   - The face is <affect-kit-pad>: the only element from affect-kit that
//     handles touch.
//   - The words are the whole vocabulary in face order (wordOrder). As in the
//     rater, they re-sort when the face settles (on release, or after a pause),
//     not while the finger moves.
//   - Words are <affect-kit-chip>. Tap one for 1, 2, 3 (strength), then off.
//     Five words at most: a sixth is refused, but a chosen word can always go up.
//   - In light mode the screen takes the face's color (surfacePalette); in dark
//     mode the face and chips are white (neutralPalette), and the glow is neutral.
//
// An app with native views swaps the DOM below for its own and calls the same
// functions from affect-kit/core: chipStyle(level, colors) returns a chip as
// plain data, facePaths(faceParams(v, a)) returns the face.
//
// This file is plain DOM on purpose, so it reads the same in any framework.

import 'affect-kit/pad';
import 'affect-kit/chip';
import {
  createRating, neutralPalette, surfacePalette, wordOrder, WORD_LIST_GAP,
  type EmotionName, type Rating,
} from 'affect-kit/core';
import type { AffectKitPad } from 'affect-kit/pad';
import type { AffectKitChip } from 'affect-kit/chip';

const MAX_WORDS = 5;   // as in the rater
const LIST_LENGTH = 14; // words shown at once, chosen ones first

type Theme = 'light' | 'dark';

export interface Checkin {
  setTheme(theme: Theme): void;
  reset(): void;
}

const CSS = `
.ck { display: grid; gap: 14px; justify-items: center; padding: 20px 16px 24px; border-radius: 20px;
      transition: background 0.2s ease; }
.ck affect-kit-pad { width: min(220px, 70%); }
.ck-row { display: flex; flex-wrap: wrap; justify-content: center;
          gap: ${WORD_LIST_GAP.row}px ${WORD_LIST_GAP.column}px; width: min(420px, 100%);
          margin: 0; padding: 0; list-style: none; }
`;

export function mountCheckin(root: HTMLElement, onRating?: (rating: Rating) => void): Checkin {
  // ── State ────────────────────────────────────────────────────────────────
  let theme: Theme = 'light';
  let face = { v: 0, a: 0 };
  let placed = false;                        // false until the face has been touched
  let order: EmotionName[] = wordOrder(0, 0); // re-sorted only when the face settles
  const levels = new Map<EmotionName, 1 | 2 | 3>();

  // ── DOM ──────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = CSS;
  const screen = document.createElement('div');
  screen.className = 'ck';
  const pad = document.createElement('affect-kit-pad') as AffectKitPad;
  const list = document.createElement('ul');
  list.className = 'ck-row';
  screen.append(pad, list);
  root.replaceChildren(style, screen);

  // ── Colors ───────────────────────────────────────────────────────────────
  // Light and touched: everything takes the face's color. Otherwise no hue.
  function colors() {
    return theme === 'light' && placed ? surfacePalette(face.v, face.a, 'light') : neutralPalette(theme);
  }

  function paintScreen() {
    const c = colors();
    screen.style.background = c.surface;
    screen.style.color = c.ink;
  }

  // ── Chips ────────────────────────────────────────────────────────────────
  function chip(name: EmotionName): HTMLLIElement {
    const el = document.createElement('affect-kit-chip') as AffectKitChip;
    el.label = name;
    el.level = levels.get(name) ?? 0;
    el.colors = colors();
    el.theme = theme;
    el.addEventListener('click', () => cycle(name));
    const li = document.createElement('li');
    li.append(el);
    return li;
  }

  // Tap cycles off → 1 → 2 → 3 → off, as in the rater.
  function cycle(name: EmotionName) {
    const now = levels.get(name) ?? 0;
    if (now === 0 && levels.size >= MAX_WORDS) return;
    if (now === 3) levels.delete(name);
    else levels.set(name, (now + 1) as 1 | 2 | 3);
    render();
    emit();
  }

  function renderList() {
    // Chosen words stay first, so they don't move out of reach.
    const chosen = [...levels.keys()];
    const rest = order.filter(name => !levels.has(name));
    list.replaceChildren(...[...chosen, ...rest].slice(0, Math.max(LIST_LENGTH, chosen.length)).map(chip));
  }

  function render() {
    paintScreen();
    pad.theme = theme;
    pad.glow = theme === 'dark' ? 'neutral' : 'color';
    renderList();
  }

  // ── Output: the same Rating the rater emits ───────────────────────────────
  // A face with no words is valid.
  function emit() {
    if (!placed) return;
    onRating?.(createRating({
      face,
      labels: [...levels].map(([name, level]) => ({ name, level })),
    }));
  }

  // ── Events ───────────────────────────────────────────────────────────────
  pad.addEventListener('input', e => {
    face = (e as CustomEvent<{ v: number; a: number }>).detail;
    placed = true;
    render(); // the screen recolors while the finger moves; the words stay put
  });
  pad.addEventListener('change', () => {
    order = wordOrder(face.v, face.a); // the face settled: re-sort
    renderList();
    emit();
  });

  render();

  return {
    setTheme(next) { theme = next; render(); emit(); },
    reset() {
      face = { v: 0, a: 0 };
      placed = false;
      order = wordOrder(0, 0);
      levels.clear();
      pad.reset();
      render();
    },
  };
}

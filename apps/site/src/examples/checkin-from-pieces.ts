// Reference implementation: a check-in built from affect-kit's pieces alone,
// with no <affect-kit-rater>. It runs on the same reducer as the rater, so it
// behaves the same: an app with its own screens (or native views) can follow
// it step by step.
//
//   - The face is <affect-kit-pad>: the only element from affect-kit that
//     handles touch. Its `input` events are the reducer's `move`, its
//     `change` (release, or a pause) is `settle`.
//   - raterReducer (affect-kit/core) holds the rules: the words re-sort only
//     when the face settles, a tap cycles 0 → 1 → 2 → 3 → 0, five words at
//     most, and a face never touched stays unset rather than the centre.
//   - Words are <affect-kit-chip>, chosen ones first.
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
  createRater, neutralPalette, raterRating, raterReducer, surfacePalette, WORD_LIST_GAP,
  type EmotionName, type Rating, type RaterEvent,
} from 'affect-kit/core';
import type { AffectKitPad } from 'affect-kit/pad';
import type { AffectKitChip } from 'affect-kit/chip';

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
  // ── State: the rater's, run by its reducer ──────────────────────────────
  let theme: Theme = 'light';
  let state = createRater();

  function dispatch(event: RaterEvent) {
    const prev = state;
    state = raterReducer(state, event);
    if (state !== prev) render();
  }

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
    const face = state.face;
    return theme === 'light' && face ? surfacePalette(face.v, face.a, 'light') : neutralPalette(theme);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function chip(name: EmotionName): HTMLLIElement {
    const el = document.createElement('affect-kit-chip') as AffectKitChip;
    el.label = name;
    el.level = state.chosen.find(c => c.name === name)?.level ?? 0;
    el.colors = colors();
    el.theme = theme;
    el.addEventListener('click', () => {
      dispatch({ type: 'tap', name });
      emit();
    });
    const li = document.createElement('li');
    li.append(el);
    return li;
  }

  function render() {
    const c = colors();
    screen.style.background = c.surface;
    screen.style.color = c.ink;
    pad.theme = theme;
    pad.glow = theme === 'dark' ? 'neutral' : 'color';
    // Chosen words stay first, so they don't move out of reach.
    const chosen = state.chosen.map(w => w.name);
    const rest = state.order.filter(name => !chosen.includes(name));
    list.hidden = !state.revealed;
    list.replaceChildren(...[...chosen, ...rest].slice(0, Math.max(LIST_LENGTH, chosen.length)).map(chip));
  }

  // ── Output: the same Rating the rater emits ───────────────────────────────
  function emit() {
    if (state.face || state.chosen.length) onRating?.(raterRating(state));
  }

  // ── Events ───────────────────────────────────────────────────────────────
  pad.addEventListener('input', e => {
    const { v, a } = (e as CustomEvent<{ v: number; a: number }>).detail;
    dispatch({ type: 'move', v, a }); // the screen recolors; the words stay put
  });
  pad.addEventListener('change', () => {
    dispatch({ type: 'settle' }); // the face settled: the words show and re-sort
    emit();
  });

  render();

  return {
    setTheme(next) { theme = next; render(); emit(); },
    reset() {
      state = createRater();
      pad.reset();
      render();
    },
  };
}

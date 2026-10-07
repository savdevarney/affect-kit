// Reference implementation: a one-step check-in built from affect-kit's pieces
// alone, with no <affect-kit-rater>. The face, a text field and one word list
// share a single screen.
//
//   - The face is <affect-kit-pad>: the only element from affect-kit that
//     handles touch.
//   - The word list switches between two orders: the whole vocabulary sorted by
//     the face (nearestLabels), then, once the person types, labels and everyday
//     words that start with what they typed (completeLabels), still in face order.
//   - Words are <affect-kit-chip>. Tap one to 1, 2, 3 for strength, then off.
//   - suggestLabels() reads the text and offers words, which the person accepts
//     by tapping. Nothing is selected for them.
//   - In light mode the screen takes the face's color (surfacePalette); in dark
//     mode the face and chips are white (neutralPalette), and the glow is neutral.
//
// An app with native views swaps the DOM below for its own and calls the same
// helpers; chipStyle(level, colors) returns the chip as plain data to draw with.
//
// This file is plain DOM on purpose, so it reads the same in any framework.

import 'affect-kit/pad';
import 'affect-kit/chip';
import {
  completeLabels, createRating, neutralPalette, nearestLabels, suggestLabels, surfacePalette,
  type EmotionName, type Rating,
} from 'affect-kit/data';
import type { AffectKitPad } from 'affect-kit/pad';
import type { AffectKitChip } from 'affect-kit/chip';

const MAX_WORDS = 5;   // as in the rater
const LIST_LENGTH = 14; // words shown at once, selected ones first

type Theme = 'light' | 'dark';

export interface Checkin {
  setTheme(theme: Theme): void;
  reset(): void;
}

const CSS = `
.ck { display: grid; gap: 14px; justify-items: center; padding: 20px 16px 24px; border-radius: 20px;
      transition: background 0.2s ease; }
.ck affect-kit-pad { width: min(220px, 70%); }
.ck input { box-sizing: border-box; width: min(340px, 100%); font: inherit; padding: 9px 14px;
            border-radius: 12px; border: 1.5px solid currentColor; background: transparent; color: inherit; }
.ck input::placeholder { color: inherit; opacity: 0.7; }
.ck-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px 10px; width: min(420px, 100%);
          margin: 0; padding: 0; list-style: none; }
.ck-label { margin: 0; font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase; }
`;

export function mountCheckin(root: HTMLElement, onRating?: (rating: Rating) => void): Checkin {
  // ── State ────────────────────────────────────────────────────────────────
  let theme: Theme = 'light';
  let face = { v: 0, a: 0 };
  let placed = false;                       // false until the face has been touched
  const levels = new Map<EmotionName, 1 | 2 | 3>();

  // ── DOM ──────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = CSS;
  const screen = document.createElement('div');
  screen.className = 'ck';
  const pad = document.createElement('affect-kit-pad') as AffectKitPad;
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'What word fits?';
  input.autocomplete = 'off';
  input.setAttribute('aria-label', 'Name a feeling');
  const suggestedLabel = document.createElement('p');
  suggestedLabel.className = 'ck-label';
  suggestedLabel.textContent = 'From your words';
  const suggestedRow = document.createElement('ul');
  suggestedRow.className = 'ck-row';
  const list = document.createElement('ul');
  list.className = 'ck-row';
  screen.append(pad, input, suggestedLabel, suggestedRow, list);
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
    suggestedLabel.style.color = c.inkDim;
  }

  // ── Chips ────────────────────────────────────────────────────────────────
  function chip(name: EmotionName, level: number, synonym: string | undefined, onTap: () => void): HTMLLIElement {
    const el = document.createElement('affect-kit-chip') as AffectKitChip;
    el.label = name;
    el.level = level;
    el.colors = colors();
    el.theme = theme;
    // A word reached through an everyday one ("stressed" → overwhelmed) says so.
    if (synonym) el.title = `matches “${synonym}”`;
    el.addEventListener('click', onTap);
    const li = document.createElement('li');
    li.append(el);
    return li;
  }

  // Tap cycles off → 1 → 2 → 3 → off, as in the rater. A suggestion is accepted
  // at the level the text implied (`acceptAt`).
  function cycle(name: EmotionName, acceptAt?: 1 | 2 | 3) {
    const now = levels.get(name) ?? 0;
    if (now === 0 && levels.size >= MAX_WORDS) return;
    if (now === 0 && acceptAt) levels.set(name, acceptAt);
    else if (now === 3) levels.delete(name);
    else levels.set(name, (now + 1) as 1 | 2 | 3);
    render();
    emit();
  }

  function renderLists() {
    const typed = input.value;
    const lastWord = typed.split(/\s+/).pop() ?? '';

    // One list, two orders: the whole vocabulary by face distance, or, once
    // typing, labels and everyday words that start with the last word.
    const candidates: Array<{ name: EmotionName; synonym?: string }> = lastWord
      ? completeLabels(lastWord, face.v, face.a)
      : nearestLabels(face.v, face.a).map(name => ({ name }));
    // Selected words stay on top so they don't scroll away while typing.
    const selected = [...levels.keys()].map(name => ({ name, synonym: candidates.find(m => m.name === name)?.synonym }));
    const rest = candidates.filter(m => !levels.has(m.name));
    const shown = [...selected, ...rest].slice(0, Math.max(LIST_LENGTH, selected.length));
    list.replaceChildren(...shown.map(m => chip(m.name, levels.get(m.name) ?? 0, m.synonym, () => cycle(m.name))));

    // What the text points at, offered unselected. Accepting is a tap; nothing
    // is chosen for the person.
    const suggestions = suggestLabels(typed).filter(s => !levels.has(s.name));
    suggestedLabel.hidden = suggestedRow.hidden = suggestions.length === 0;
    suggestedRow.replaceChildren(...suggestions.map(s => chip(s.name, 0, s.synonym, () => cycle(s.name, s.level))));
  }

  function render() {
    paintScreen();
    pad.theme = theme;
    pad.glow = theme === 'dark' ? 'neutral' : 'color';
    renderLists();
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
    render(); // the screen recolors while the finger moves
  });
  pad.addEventListener('change', emit);
  input.addEventListener('input', renderLists);

  render();

  return {
    setTheme(next) { theme = next; render(); emit(); },
    reset() {
      face = { v: 0, a: 0 };
      placed = false;
      levels.clear();
      input.value = '';
      pad.reset();
      render();
    },
  };
}

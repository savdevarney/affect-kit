import { describe, expect, it } from 'vitest';
import { PhraseSafetyScreen } from '../src/safety/phrase-screen.ts';

const screen = new PhraseSafetyScreen();

describe('PhraseSafetyScreen', () => {
  it.each([
    'I want to kill myself',
    'thinking about suicide again',
    'I just want to die',
    'I wish I could go to sleep and not wake up',
    'everyone would be better off without me',
    "I don't want to be here anymore",
    'I keep wanting to hurt myself',
    'started cutting again',
    'honestly kms',
    'thinking about unaliving myself',
    'My friend said she wants to die and I’m scared',
    "I don't feel safe at home",
  ])('shows resources for: %s', (text) => {
    expect(screen.screen(text).show).toBe(true);
  });

  it.each([
    'This commute is killing me',
    'I could murder a burrito',
    'I want to die of embarrassment',
    'Dying to see the new exhibit',
    'Cut my finger chopping onions, ouch',
    "I'm safe at home now",
    'Tired and a bit sad',
  ])('stays quiet for: %s', (text) => {
    expect(screen.screen(text).show).toBe(false);
  });

  it('reports rule ids, never the text', () => {
    expect(screen.screen('I want to kill myself')).toEqual({ show: true, rules: ['kill-myself'] });
  });
});

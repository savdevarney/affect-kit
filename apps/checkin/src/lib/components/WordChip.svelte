<!--
  One feeling word as a chip, in the rater's own visual language: color from
  the word's place in the lexicon, strength as rings (one, two or three).
  Level 0 is a word offered but not chosen.
-->
<script lang="ts">
  import { EMOTION_LABELS, type EmotionName } from 'affect-kit/data';
  import { chipLabel, normalize, type Level } from '@affect-kit/checkin-core';

  interface Props {
    name: EmotionName;
    level: 0 | Level;
    /** The span of their words it came from: shown when it isn't just the word itself. */
    said?: string | null;
    /** Faded: a check-in nobody reviewed. */
    dimmed?: boolean;
    onpress?: () => void;
    onremove?: () => void;
  }

  let { name, level, said = null, dimmed = false, onpress, onremove }: Props = $props();

  const coords = $derived(EMOTION_LABELS[name]);
  const label = $derived(level > 0 ? chipLabel(name, level as Level) : name);
  const showSaid = $derived(said !== null && normalize(said) !== name);
</script>

<span class="chip-wrap">
  <span class="chip word-color" class:chosen={level > 0} class:dimmed data-level={level} style:--v={coords.v} style:--a={coords.a}>
    {#if onpress}
      <button type="button" class="word" onclick={onpress} aria-label={level > 0 ? `${label}. Tap to change how strong` : `Add ${name}`}>{name}</button>
    {:else}
      <span class="word" role="img" aria-label={label}>{name}</span>
    {/if}
    {#if onremove}
      <button type="button" class="remove" onclick={onremove} aria-label={`Remove ${name}`}>×</button>
    {/if}
  </span>
  {#if showSaid}<span class="said">“{said}”</span>{/if}
</span>

<style>
  .chip-wrap {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
  }

  .chip {
    --ring: color-mix(in oklab, var(--word) 50%, var(--ink));
    --gap: var(--surface);
    display: inline-flex;
    align-items: center;
    border: 2px solid transparent;
    border-radius: 999px;
    background: color-mix(in oklab, var(--word) 16%, var(--surface));
    transition: box-shadow 0.18s ease, background 0.2s ease;

    /* Chosen: the word's own color, lifted toward white so dark text reads on every hue. */
    &.chosen {
      background: color-mix(in oklab, var(--word) 75%, white);
      border-color: var(--ring);
      color: #141413;
      font-weight: 700;
    }

    /* Strength as outward rings, like the rater's chips: the chip never resizes. */
    &[data-level='2'] {
      box-shadow: 0 0 0 1.5px var(--gap), 0 0 0 3px var(--ring);
    }
    &[data-level='3'] {
      box-shadow: 0 0 0 1.5px var(--gap), 0 0 0 3px var(--ring), 0 0 0 4.5px var(--gap), 0 0 0 5.7px var(--ring);
    }

    &.dimmed {
      opacity: 0.55;
    }
  }

  .word {
    padding: 0.45em 1.05em;
    border: 0;
    background: none;
    font-size: 0.95rem;
    line-height: 1.2;
    cursor: default;

    &:is(button) {
      cursor: pointer;
    }
  }

  .chip:has(.remove) .word {
    padding-inline-end: 0.35em;
  }

  .remove {
    min-width: 2rem;
    min-height: 2rem;
    margin-inline-end: 0.2rem;
    border: 0;
    border-radius: 999px;
    background: none;
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
    opacity: 0.6;

    &:hover {
      opacity: 1;
    }
  }

  .said {
    max-width: 14ch;
    font-size: 0.75rem;
    color: var(--ink-muted);
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>

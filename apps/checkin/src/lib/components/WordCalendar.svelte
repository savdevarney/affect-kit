<!--
  The word calendar (docs/checkin/visualizations.md › C): the words someone
  used as rows, days as columns, a dot where a word was logged. Dot size is
  the strongest level that day; color is the word's lexicon color. It's a
  real <table>, so a screen reader hears "calm, Tuesday 6 October, strongly".
  Presence and counts only: no lines, no averages, no verdicts.
-->
<script lang="ts">
  import { EMOTION_LABELS } from 'affect-kit/data';
  import { checkinCount, COPY, LEVEL_WORDS, readingOrder, type EmotionName, type Level } from '@affect-kit/checkin-core';
  import type { DayWords } from '$lib/prototype-data';

  interface Props {
    /** Consecutive local dates, oldest first, in whole weeks. */
    dates: string[];
    checkins: DayWords[];
  }
  let { dates, checkins }: Props = $props();

  const weeks = $derived(Array.from({ length: Math.ceil(dates.length / 7) }, (_, i) => dates.slice(i * 7, i * 7 + 7)));
  const rows = $derived(readingOrder(new Set(checkins.flatMap((c) => c.words.map((w) => w.name)))));
  const ownWords = $derived([...new Set(checkins.flatMap((c) => c.unmatched))].sort());

  /** The strongest level a word had on a date, or 0. */
  const levelOn = $derived.by(() => {
    const strongest = new Map<string, Level>();
    for (const c of checkins) {
      for (const w of c.words) {
        const key = `${w.name}|${c.localDate}`;
        strongest.set(key, Math.max(strongest.get(key) ?? 0, w.level) as Level);
      }
    }
    return (name: EmotionName, date: string) => strongest.get(`${name}|${date}`) ?? 0;
  });
  const ownOn = (said: string, date: string) => checkins.some((c) => c.localDate === date && c.unmatched.includes(said));
  const checkinsOn = (date: string) => checkins.filter((c) => c.localDate === date).length;

  const day = (date: string, style: 'narrow' | 'long') =>
    new Intl.DateTimeFormat(undefined, style === 'narrow' ? { weekday: 'narrow', timeZone: 'UTC' } : { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
</script>

<div class="scroll">
  <table>
    <caption class="visually-hidden">{COPY.weeks.caption}</caption>
    <thead>
      <tr>
        <th scope="col"><span class="visually-hidden">Word</span></th>
        {#each weeks as week, w (week[0])}
          {#each week as date (date)}
            <th scope="col" class:week-start={w > 0 && date === week[0]} title={day(date, 'long')}>
              <span aria-hidden="true">{day(date, 'narrow')}</span><span class="visually-hidden">{day(date, 'long')}</span>
            </th>
          {/each}
          <th scope="col" class="count">{COPY.weeks.days}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each rows as name (name)}
        <tr>
          <th scope="row">{name}</th>
          {#each weeks as week, w (week[0])}
            {#each week as date (date)}
              {@const level = levelOn(name, date)}
              <td class:week-start={w > 0 && date === week[0]}>
                {#if level}
                  <span class="dot word-color" data-level={level} style:--v={EMOTION_LABELS[name].v} style:--a={EMOTION_LABELS[name].a} title={`${name}, ${day(date, 'long')}: ${LEVEL_WORDS[level]}`}></span>
                  <span class="visually-hidden">{LEVEL_WORDS[level]}</span>
                {/if}
              </td>
            {/each}
            <td class="count">{week.filter((date) => levelOn(name, date) > 0).length || ''}</td>
          {/each}
        </tr>
      {/each}
      {#each ownWords as said (said)}
        <tr class="own">
          <th scope="row">{said}<span class="mark" aria-label="your word">*</span></th>
          {#each weeks as week, w (week[0])}
            {#each week as date (date)}
              <td class:week-start={w > 0 && date === week[0]}>
                {#if ownOn(said, date)}<span class="dot own-dot" title={`${said} (your word), ${day(date, 'long')}`}></span><span class="visually-hidden">logged</span>{/if}
              </td>
            {/each}
            <td class="count">{week.filter((date) => ownOn(said, date)).length || ''}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
    <tfoot>
      <tr>
        <th scope="row">{COPY.weeks.checkins}</th>
        {#each weeks as week, w (week[0])}
          {#each week as date (date)}
            <td class:week-start={w > 0 && date === week[0]}>{checkinsOn(date) || '·'}</td>
          {/each}
          <td class="count">{week.reduce((t, date) => t + checkinsOn(date), 0)}</td>
        {/each}
      </tr>
    </tfoot>
  </table>
</div>
<p class="note">{checkinCount(checkins.length)} over {dates.length} days. * {COPY.weeks.ownWordMark}</p>

<style>
  .scroll {
    overflow-x: auto;
  }

  table {
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  th,
  td {
    padding: 0;
    text-align: center;
  }

  thead th {
    padding-block-end: 0.5rem;
    color: var(--ink-faint);
    font-weight: 500;
  }

  tbody th,
  tfoot th {
    padding-inline-end: 0.9rem;
    text-align: end;
    font-weight: 500;
    white-space: nowrap;
  }

  td {
    width: 1.9rem;
    height: 1.9rem;
  }

  .week-start {
    border-inline-start: 1px solid var(--line);
  }

  .count {
    width: 2.6rem;
    color: var(--ink-muted);
    font-variant-numeric: tabular-nums;
  }

  tfoot td,
  tfoot th {
    padding-block-start: 0.5rem;
    border-top: 1px solid var(--line);
    color: var(--ink-muted);
    font-variant-numeric: tabular-nums;
  }

  /* Dot size is strength: three steps, like the rings on a chip. */
  .dot {
    display: inline-block;
    width: var(--size);
    height: var(--size);
    border-radius: 50%;
    background: var(--word);
    box-shadow: 0 0 0 1px color-mix(in oklab, var(--word) 60%, var(--ink));
    vertical-align: middle;

    &[data-level='1'] {
      --size: 0.45rem;
    }
    &[data-level='2'] {
      --size: 0.75rem;
    }
    &[data-level='3'] {
      --size: 1.05rem;
    }
  }

  .own-dot {
    --size: 0.7rem;
    background: transparent;
    box-shadow: inset 0 0 0 1.5px var(--ink-muted);
  }

  .mark {
    color: var(--ink-faint);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>

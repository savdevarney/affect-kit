<!--
  One check-in in the day view, as it was logged: its time, the face they
  placed, the words they kept, and their own text one tap away. Nothing is
  computed about it (docs/checkin/visualizations.md › A).
-->
<script lang="ts">
  import { COPY } from '@affect-kit/checkin-core';
  import type { Checkin } from '$lib/api';
  import WordChip from './WordChip.svelte';

  interface Props {
    checkin: Checkin;
    ondelete: (id: string) => void;
  }
  let { checkin, ondelete }: Props = $props();

  let dialog = $state<HTMLDialogElement>();
  const time = $derived(new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: checkin.timezone }).format(new Date(checkin.createdAt)));
  const reviewed = $derived(checkin.reviewedAt !== null);
</script>

<article class="checkin">
  <time datetime={checkin.createdAt}>{time}</time>
  <affect-kit-face v={checkin.face.v} a={checkin.face.a} theme="auto" animated="false"></affect-kit-face>
  <div class="body">
    {#if checkin.words.length || checkin.unmatched.length}
      <div class="chips">
        {#each checkin.words as word (word.name)}
          <WordChip name={word.name} level={word.level} dimmed={!reviewed} />
        {/each}
        {#each checkin.unmatched as said (said)}
          <span class="own-word">{said}</span>
        {/each}
      </div>
    {/if}
    {#if !reviewed && checkin.words.length}<p class="note">{COPY.day.notReviewed}</p>{/if}
    {#if checkin.body}
      <details>
        <summary>{COPY.day.yourWords}</summary>
        <p>{checkin.body}</p>
      </details>
    {/if}
  </div>
  <button class="delete" type="button" aria-label={`${COPY.day.delete} the check-in at ${time}`} onclick={() => dialog?.showModal()}>{COPY.day.delete}</button>

  <dialog bind:this={dialog} aria-labelledby={`confirm-${checkin.id}`}>
    <form method="dialog">
      <p id={`confirm-${checkin.id}`}>{COPY.day.confirmDelete}</p>
      <div class="actions">
        <button class="button" value="delete" onclick={() => ondelete(checkin.id)}>{COPY.day.delete}</button>
        <button class="button quiet" value="cancel">{COPY.day.cancel}</button>
      </div>
    </form>
  </dialog>
</article>

<style>
  .checkin {
    display: grid;
    grid-template-columns: 4.5rem 3rem 1fr auto;
    align-items: start;
    gap: 0.9rem;
    padding-block: 1.1rem;
    border-top: 1px solid var(--line);
  }

  time {
    padding-block-start: 0.7rem;
    font-variant-numeric: tabular-nums;
    color: var(--ink-muted);
  }

  affect-kit-face {
    width: 3rem;
    height: 3rem;
  }

  .body {
    display: grid;
    gap: 0.5rem;
    min-width: 0;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 0.6rem;
    padding-block: 0.35rem;
  }

  .own-word {
    padding: 0.35em 0.9em;
    border: 1.5px dashed var(--line);
    border-radius: 999px;
    font-size: 0.9rem;
  }

  details {
    font-size: 0.9rem;
    color: var(--ink-muted);

    & summary {
      cursor: pointer;
      width: fit-content;
    }

    & p {
      margin-block-start: 0.35rem;
      color: var(--ink);
    }
  }

  .delete {
    padding: 0.5rem 0.2rem;
    border: 0;
    background: none;
    color: var(--ink-faint);
    font-size: 0.8rem;
    cursor: pointer;

    &:hover {
      color: var(--ink);
    }
  }

  dialog {
    max-width: min(26rem, calc(100vw - 2rem));
    padding: 1.4rem;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--ink);

    &::backdrop {
      background: rgb(0 0 0 / 0.35);
    }
  }

  .actions {
    display: flex;
    gap: 0.6rem;
    margin-block-start: 1rem;
  }

  @container (width < 30rem) {
    .checkin {
      grid-template-columns: 3rem 1fr auto;
    }
  }

  @media (width < 34rem) {
    .checkin {
      grid-template-columns: 3rem 1fr;
      grid-template-areas: 'face time' 'face body' 'face delete';
    }
    time {
      grid-area: time;
      padding: 0;
    }
    affect-kit-face {
      grid-area: face;
    }
    .body {
      grid-area: body;
    }
    .delete {
      grid-area: delete;
      justify-self: start;
    }
  }
</style>

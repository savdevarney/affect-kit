<!--
  The check-in: anchor, then converse, then confirm (docs/checkin/README.md).
  1. Face: the face-only rater; the gesture is the anchor.
  2. Words: what's going on, in their own words.
  3. Review: the feeling words found, as chips they can change. Done saves.
  Bridge to Angular: one component, its step held in a signal-like $state rune.
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import type { Rating } from 'affect-kit/data';
  import { COPY, MAX_TEXT, MAX_WORDS, PhraseSafetyScreen, nearestWords, uuidv7, type EmotionName, type Face, type Level } from '@affect-kit/checkin-core';
  import { createCheckin, reviewWords, type Created } from '$lib/api';
  import WordChip from '$lib/components/WordChip.svelte';
  import CrisisPanel from '$lib/components/CrisisPanel.svelte';

  type Step = 'face' | 'words' | 'review';
  interface Chosen {
    name: EmotionName;
    level: Level;
    said: string | null;
  }

  const screen = new PhraseSafetyScreen();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  let step = $state<Step>('face');
  let face = $state<Face>({ v: 0, a: 0 });
  let text = $state('');
  // Made once per check-in: a retry after a network error sends the same id, so it can't be saved twice.
  let checkinId = uuidv7();
  let busy = $state(false);
  let failed = $state<string | null>(null);
  let showCrisis = $state(false);
  let created = $state<Created | null>(null);
  let chosen = $state<Chosen[]>([]);
  let adding = $state(false);

  const chosenNames = $derived(new Set(chosen.map((w) => w.name)));
  const addable = $derived(nearestWords(face, 55).filter((name) => !chosenNames.has(name)));
  const full = $derived(chosen.length >= MAX_WORDS);

  function onFace(event: CustomEvent<Rating>) {
    face = event.detail.face;
    step = 'words';
  }

  async function findWords(withText: boolean) {
    const body = withText ? text : '';
    // The screen runs here first, so resources show the moment they press, before the network.
    showCrisis = screen.screen(body).show;
    busy = true;
    failed = null;
    try {
      created = await createCheckin({ id: checkinId, face, text: body, timezone });
      showCrisis ||= created.safety.show;
      chosen = created.words.map((w) => ({ name: w.name, level: w.level, said: w.evidence }));
      step = 'review';
    } catch {
      failed = 'Couldn’t save that. Check your connection and try again: nothing is saved twice.';
    } finally {
      busy = false;
    }
  }

  function cycle(name: EmotionName) {
    chosen = chosen.map((w) => (w.name === name ? { ...w, level: ((w.level % 3) + 1) as Level } : w));
  }

  function remove(name: EmotionName) {
    chosen = chosen.filter((w) => w.name !== name);
  }

  function add(name: EmotionName) {
    if (full || chosenNames.has(name)) return;
    chosen = [...chosen, { name, level: 2, said: null }];
  }

  async function done() {
    if (!created) return;
    busy = true;
    failed = null;
    try {
      await reviewWords(created.id, { words: chosen.map(({ name, level }) => ({ name, level })) });
      await goto(`/day/${created.localDate}`);
    } catch {
      failed = 'Couldn’t save your words. Try again.';
      busy = false;
    }
  }
</script>

<svelte:head><title>Check in</title></svelte:head>

{#if showCrisis}
  <CrisisPanel />
{/if}

{#if step === 'face'}
  <section class="step" aria-labelledby="face-title">
    <h1 id="face-title">{COPY.faceStep.title}</h1>
    <p class="note">{COPY.faceStep.hint}</p>
    <affect-kit-rater face-only submit-label={COPY.faceStep.next} color-mode="background" theme="auto" oncommit={onFace}></affect-kit-rater>
  </section>
{:else if step === 'words'}
  <section class="step" aria-labelledby="words-title">
    <div class="with-face">
      <affect-kit-face v={face.v} a={face.a} theme="auto"></affect-kit-face>
      <h1 id="words-title">{COPY.wordsStep.title}</h1>
    </div>
    <form
      onsubmit={(event) => {
        event.preventDefault();
        void findWords(true);
      }}
    >
      <label class="visually-hidden" for="words">{COPY.wordsStep.title}</label>
      <!-- svelte-ignore a11y_autofocus -->
      <textarea id="words" bind:value={text} maxlength={MAX_TEXT} rows="4" placeholder={COPY.wordsStep.placeholder} autofocus></textarea>
      <div class="actions">
        <button class="button" type="submit" disabled={busy || !text.trim()}>{busy ? COPY.wordsStep.working : COPY.wordsStep.submit}</button>
        <button class="button quiet" type="button" disabled={busy} onclick={() => findWords(false)}>{COPY.wordsStep.skip}</button>
      </div>
    </form>
  </section>
{:else if step === 'review' && created}
  <section class="step" aria-labelledby="review-title">
    <div class="with-face">
      <affect-kit-face v={face.v} a={face.a} theme="auto"></affect-kit-face>
      <h1 id="review-title">{COPY.reviewStep.title}</h1>
    </div>
    {#if created.body}<blockquote>{created.body}</blockquote>{/if}

    {#if chosen.length}
      <p class="note">{COPY.reviewStep.hint}</p>
      <div class="chips" role="list">
        {#each chosen as word (word.name)}
          <span role="listitem"><WordChip name={word.name} level={word.level} said={word.said} onpress={() => cycle(word.name)} onremove={() => remove(word.name)} /></span>
        {/each}
      </div>
    {/if}

    <!-- Under crisis resources, no nudges toward words: they can still add their own. -->
    {#if created.suggestions.length && !chosen.length && !showCrisis}
      <p class="note">{COPY.reviewStep.noneFound}</p>
      <div class="chips">
        {#each created.suggestions as name (name)}
          <WordChip {name} level={0} onpress={() => add(name)} />
        {/each}
      </div>
    {/if}

    {#if created.unmatched.length}
      <div class="unmatched">
        {#each created.unmatched as said (said)}
          <span class="own-word">{said} <small>({COPY.reviewStep.yourWord})</small></span>
        {/each}
        <p class="note">{COPY.reviewStep.yourWordNote}</p>
      </div>
    {/if}

    {#if created.foundWith === 'simple'}<p class="note">{COPY.reviewStep.simpleMatching}</p>{/if}

    <div class="actions">
      <button class="button" type="button" disabled={busy} onclick={done}>{COPY.reviewStep.done}</button>
      <button class="button quiet" type="button" aria-expanded={adding} disabled={full} onclick={() => (adding = !adding)}>{COPY.reviewStep.add}</button>
    </div>

    {#if adding && !full}
      <div class="add">
        <p class="note">{COPY.reviewStep.addHint}</p>
        <div class="chips small">
          {#each addable as name (name)}
            <WordChip {name} level={0} onpress={() => add(name)} />
          {/each}
        </div>
      </div>
    {/if}
  </section>
{/if}

{#if failed}<p class="error" role="alert">{failed}</p>{/if}

<style>
  .step {
    display: grid;
    gap: 1.1rem;
    margin-block-start: 1rem;
  }

  h1 {
    font-size: clamp(1.6rem, 5vw, 2.2rem);
  }

  affect-kit-rater {
    width: 100%;
    margin-inline: auto;
  }

  .with-face {
    display: flex;
    align-items: center;
    gap: 0.9rem;

    & affect-kit-face {
      width: 3.5rem;
      height: 3.5rem;
      flex: none;
    }
  }

  textarea {
    width: 100%;
    padding: 0.9rem 1rem;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    font-size: 1.1rem;
    line-height: 1.45;
    resize: vertical;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-block-start: 0.4rem;
  }

  blockquote {
    margin: 0;
    padding-inline-start: 0.9rem;
    border-inline-start: 3px solid var(--line);
    color: var(--ink-muted);
    font-style: italic;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 1rem 0.9rem;
    padding-block: 0.3rem;

    &.small {
      gap: 0.6rem 0.5rem;
      font-size: 0.9rem;
    }
  }

  .unmatched {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .own-word {
    padding: 0.35em 0.9em;
    border: 1.5px dashed var(--line);
    border-radius: 999px;
    font-size: 0.95rem;

    & small {
      color: var(--ink-muted);
    }
  }

  .unmatched .note {
    flex-basis: 100%;
  }

  .add {
    display: grid;
    gap: 0.6rem;
  }

  .error {
    margin-block-start: 1rem;
    color: light-dark(#a1122f, #ff8fa6);
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

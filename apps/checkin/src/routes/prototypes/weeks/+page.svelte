<!--
  Prototype: the word calendar on two weeks of synthetic check-ins
  (docs/checkin/visualizations.md › C). Not wired to real data: the views that
  show change over time wait for Sav's review of the wording rules (§ 4).
-->
<script lang="ts">
  import { addDays, localDate } from '@affect-kit/checkin-core';
  import { syntheticWeeks } from '$lib/prototype-data';
  import WordCalendar from '$lib/components/WordCalendar.svelte';

  const today = localDate(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
  // Two weeks back, from that week's Monday through today: whole weeks, and this one so far.
  const twoWeeksAgo = addDays(today, -13);
  const monday = addDays(twoWeeksAgo, -((new Date(`${twoWeeksAgo}T12:00:00Z`).getUTCDay() + 6) % 7));
  const dates: string[] = [];
  for (let date = monday; date <= today; date = addDays(date, 1)) dates.push(date);
  const checkins = syntheticWeeks(today, dates.length);
</script>

<svelte:head><title>Weeks (prototype) · Check-in</title></svelte:head>

<header class="intro">
  <p class="tag">Prototype · synthetic data</p>
  <h1>Two weeks of words</h1>
  <p class="note">
    The words logged each day. A dot means the word was logged that day, and its size is how strong it was. Each week ends with the number of days the
    word was logged; the last week is this week so far. Gaps are days without that word, or without check-ins.
  </p>
</header>

<WordCalendar {dates} {checkins} />

<style>
  .intro {
    display: grid;
    gap: 0.6rem;
    margin-block: 1rem 1.5rem;
  }

  h1 {
    font-size: clamp(1.5rem, 5vw, 2rem);
  }

  .tag {
    width: fit-content;
    padding: 0.2em 0.7em;
    border: 1px solid var(--line);
    border-radius: 999px;
    font-size: 0.75rem;
    color: var(--ink-muted);
  }
</style>

<!--
  A day as it was logged (docs/checkin/visualizations.md › A): check-ins in
  order, each as it happened, with nothing drawn between them and nothing
  computed about the day. The count of check-ins is always on screen.
-->
<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { addDays, checkinCount, COPY } from '@affect-kit/checkin-core';
  import { deleteCheckin } from '$lib/api';
  import CheckinCard from '$lib/components/CheckinCard.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const label = $derived.by(() => {
    if (data.date === data.today) return COPY.day.today;
    if (data.date === addDays(data.today, -1)) return COPY.day.yesterday;
    const [y, m, d] = data.date.split('-').map(Number) as [number, number, number];
    return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
  });

  async function remove(id: string) {
    await deleteCheckin(id);
    await invalidateAll();
  }
</script>

<svelte:head><title>{label} · Check-in</title></svelte:head>

<header class="day">
  <a class="step" href={`/day/${addDays(data.date, -1)}`} aria-label={COPY.day.before}>←</a>
  <div>
    <h1>{label}</h1>
    <p class="note">{checkinCount(data.checkins.length)}</p>
  </div>
  {#if data.date < data.today}
    <a class="step" href={`/day/${addDays(data.date, 1)}`} aria-label={COPY.day.after}>→</a>
  {:else}
    <span class="step" aria-hidden="true"></span>
  {/if}
</header>

{#if data.checkins.length}
  <div class="list">
    {#each data.checkins as checkin (checkin.id)}
      <CheckinCard {checkin} ondelete={remove} />
    {/each}
  </div>
{:else}
  <div class="empty">
    <p>{COPY.day.empty}</p>
    {#if data.date === data.today}<a class="button" href="/">{COPY.day.checkIn}</a>{/if}
  </div>
{/if}

<style>
  .day {
    display: grid;
    grid-template-columns: 2.75rem 1fr 2.75rem;
    align-items: center;
    gap: 0.75rem;
    margin-block: 1rem 1.25rem;
    text-align: center;
  }

  h1 {
    font-size: clamp(1.5rem, 5vw, 2rem);
  }

  .step {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 999px;
    text-decoration: none;
    font-size: 1.2rem;

    &:is(a):hover {
      background: var(--surface);
    }
  }

  .list {
    container-type: inline-size;
    border-bottom: 1px solid var(--line);
  }

  .empty {
    display: grid;
    justify-items: center;
    gap: 1rem;
    padding-block: 3rem;
    color: var(--ink-muted);
  }
</style>

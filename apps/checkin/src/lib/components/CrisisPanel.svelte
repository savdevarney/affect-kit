<!--
  Crisis resources, shown first and at once when the safety screen matches.
  Static copy from the core (never written by a model), calm rather than
  alarming, and it never blocks the person: their check-in carries on below.
  Focus moves here so a screen reader announces it first.
-->
<script lang="ts">
  import { CRISIS_COPY, CRISIS_LINES } from '@affect-kit/checkin-core';

  let heading = $state<HTMLElement>();
  $effect(() => heading?.focus());
</script>

<section class="crisis" aria-labelledby="crisis-title">
  <h2 id="crisis-title" tabindex="-1" bind:this={heading}>{CRISIS_COPY.title}</h2>
  <p class="lede">{CRISIS_COPY.lede}</p>

  <ul>
    {#each CRISIS_LINES as line (line.id)}
      <li>
        <div>
          <strong>{line.action}</strong>
          <span class="name">{line.name}</span>
        </div>
        <div class="links">
          {#each line.links as link (link.href)}
            <a class="button quiet" href={link.href}>{link.label}</a>
          {/each}
        </div>
      </li>
    {/each}
  </ul>

  <p class="emergency">{CRISIS_COPY.emergency}</p>
  <p class="note">
    {CRISIS_COPY.canada}
    {CRISIS_COPY.elsewhere.before}
    <a href={CRISIS_COPY.elsewhere.href} rel="noopener noreferrer" target="_blank">{CRISIS_COPY.elsewhere.link}</a>
    {CRISIS_COPY.elsewhere.after}
  </p>
  <p class="note">{CRISIS_COPY.notMonitored}</p>
</section>

<style>
  .crisis {
    display: grid;
    gap: 0.9rem;
    padding: clamp(1.1rem, 3vw, 1.6rem);
    border: 2px solid var(--ink);
    border-radius: var(--radius);
    background: var(--surface);
  }

  h2 {
    font-size: 1.35rem;
    &:focus {
      outline: none;
    }
  }

  ul {
    display: grid;
    gap: 0.6rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem 1rem;
    padding-block: 0.6rem;
    border-top: 1px solid var(--line);
  }

  .name {
    display: block;
    font-size: 0.875rem;
    color: var(--ink-muted);
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .links .button {
    min-height: 2.5rem;
    padding-inline: 1em;
  }

  .emergency {
    font-weight: 600;
  }
</style>

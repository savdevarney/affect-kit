<script lang="ts">
  import '../app.css';
  import { onMount, type Snippet } from 'svelte';
  import { page } from '$app/state';
  import { COPY } from '@affect-kit/checkin-core';

  let { children }: { children: Snippet } = $props();

  // affect-kit's elements are defined before any page renders, so Svelte sets
  // `rating` and friends as properties on upgraded elements.
  let ready = $state(false);
  onMount(async () => {
    await import('affect-kit');
    ready = true;
  });

  const current = (path: string) => (path === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(path)) ? 'page' : undefined;
</script>

<header class="top">
  <a class="brand" href="/">Check-in</a>
  <nav aria-label="Main">
    <a href="/" aria-current={current('/')}>Check in</a>
    <a href="/day" aria-current={current('/day')}>Days</a>
    <a href="/prototypes/weeks" aria-current={current('/prototypes')}>Weeks</a>
  </nav>
</header>

<main>
  {#if ready}{@render children()}{/if}
</main>

<footer>
  <p>{COPY.notAdvice}</p>
  <p>
    Feeling words and their valence, arousal and dominance come from the
    <a href="https://saifmohammad.com/WebPages/nrc-vad.html">NRC VAD Lexicon</a> (v2.1) by Saif M. Mohammad, National Research Council Canada,
    through <a href="https://affectkit.com">affect-kit</a>.
  </p>
</footer>

<style>
  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem 1.5rem;
    max-width: 44rem;
    margin-inline: auto;
    padding: 1.1rem var(--space);
  }

  .brand {
    font-weight: 800;
    letter-spacing: -0.02em;
    text-decoration: none;
  }

  nav {
    display: flex;
    gap: 1.1rem;

    & a {
      color: var(--ink-muted);
      text-decoration: none;
      padding-block: 0.4rem;
      border-bottom: 2px solid transparent;
    }

    & a[aria-current='page'] {
      color: var(--ink);
      border-color: var(--ink);
    }
  }

  main {
    max-width: 44rem;
    margin-inline: auto;
    padding: 0.5rem var(--space) 3rem;
  }

  footer {
    display: grid;
    gap: 0.4rem;
    max-width: 44rem;
    margin-inline: auto;
    padding: 1.5rem var(--space) 2.5rem;
    border-top: 1px solid var(--line);
    font-size: 0.8rem;
    color: var(--ink-faint);
  }
</style>

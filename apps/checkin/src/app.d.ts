import type { HTMLAttributes } from 'svelte/elements';
import type { Rating } from 'affect-kit/data';
import type { Env } from '$lib/server/env';

declare global {
  namespace App {
    interface Platform {
      env: Env;
    }
  }
}

type Theme = 'light' | 'dark' | 'auto';

// affect-kit's custom elements as Svelte sees them: attributes in kebab-case,
// `rating` as a property, and the rater's `commit` event as `oncommit`.
declare module 'svelte/elements' {
  export interface SvelteHTMLElements {
    'affect-kit-rater': HTMLAttributes<HTMLElement> & {
      'face-only'?: boolean;
      'submit-label'?: string;
      'color-mode'?: 'background' | 'words';
      theme?: Theme;
      oncommit?: (event: CustomEvent<Rating>) => void;
    };
    // `animated` is set as a property on the upgraded element, so it takes a boolean: the string "false" would be truthy.
    'affect-kit-face': HTMLAttributes<HTMLElement> & { v?: number; a?: number; animated?: boolean; theme?: Theme };
    'affect-kit-result': HTMLAttributes<HTMLElement> & {
      rating?: Rating | null;
      'show-face'?: boolean;
      'show-labels'?: boolean;
      'color-mode'?: 'background' | 'words';
      layout?: 'auto' | 'stack' | 'row';
      theme?: Theme;
    };
  }
}

export {};

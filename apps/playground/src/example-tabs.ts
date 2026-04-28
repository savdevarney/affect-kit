// Small playground-only Lit element for the Demo/Code tab pattern shown
// under each example card. Two named slots — `demo` and `code` — toggle
// visibility based on the active tab. State is per-instance.

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('example-tabs')
export class ExampleTabs extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid rgba(0,0,0,0.06);
      margin: 0 0 1rem;
    }
    button {
      background: none;
      border: none;
      font-family: inherit;
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #aaa;
      cursor: pointer;
      padding: 0.45rem 0.7rem;
      border-bottom: 1.5px solid transparent;
      margin-bottom: -1px;
      transition: color 0.15s ease;
    }
    button:hover { color: #555; }
    button[aria-selected="true"] {
      color: #1a1a1a;
      border-bottom-color: #1a1a1a;
    }
    .panel { display: none; }
    .panel[data-active] { display: block; }
    /* Default styling for slotted code blocks. Consumers can override
       by wrapping in their own <pre> with custom styles. */
    ::slotted(pre) {
      background: #faf9f6;
      border: 1px solid rgba(0,0,0,0.05);
      border-radius: 0.5rem;
      padding: 0.85rem 1.1rem;
      margin: 0;
      overflow-x: auto;
      font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', ui-monospace, monospace;
      font-size: 0.72rem;
      line-height: 1.55;
      color: #444;
      white-space: pre;
    }
  `;

  @state() private _active: 'demo' | 'code' = 'demo';

  override render() {
    return html`
      <div class="tabs" role="tablist">
        <button
          role="tab"
          aria-selected=${this._active === 'demo'}
          @click=${() => { this._active = 'demo'; }}
        >Demo</button>
        <button
          role="tab"
          aria-selected=${this._active === 'code'}
          @click=${() => { this._active = 'code'; }}
        >Code</button>
      </div>
      <div class="panel" ?data-active=${this._active === 'demo'}>
        <slot name="demo"></slot>
      </div>
      <div class="panel" ?data-active=${this._active === 'code'}>
        <slot name="code"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'example-tabs': ExampleTabs;
  }
}

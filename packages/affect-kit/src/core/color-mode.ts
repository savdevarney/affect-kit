// Shared Lit property converter for the `color-mode` attribute.
//
// The HTML attribute is a string enum: 'background' | 'words'. To stay
// backwards-compatible with the previous boolean attribute (`<el color-mode>`,
// which set the now-old boolean prop to `true`), we treat empty string,
// 'true', and 'background' as 'background'.

import type { ColorMode } from './types';

/** @internal */
export const colorModeConverter = {
  fromAttribute(value: string | null): ColorMode | null {
    if (value === null) return null;
    if (value === '' || value === 'true' || value === 'background') return 'background';
    if (value === 'words') return 'words';
    return null;
  },
  toAttribute(value: ColorMode | null): string | null {
    return value;
  },
};

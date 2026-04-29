import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// React harness for affect-kit. Validates that the @affect-kit/react
// wrappers do what they advertise: typed props, idiomatic onChange,
// correct property handling, ref forwarding.
export default defineConfig({
  plugins: [react()],
});

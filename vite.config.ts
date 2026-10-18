/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/stack-reversi/',
  plugins: [react()],
  worker: { format: 'es' },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});

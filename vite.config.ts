import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves the project at /<repo>/, so assets need that base.
// Set BASE_PATH=/ (or leave unset locally) for root-served deployments.
const base = process.env.BASE_PATH ?? (process.env.GITHUB_ACTIONS ? '/GrantsandFunds/' : '/')

export default defineConfig({
  base,
  plugins: [react()],
})

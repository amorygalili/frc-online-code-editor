import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: ['frc-challenge-site', 'react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          'frc-challenge-site': 'FrcChallengeSite',
          'react': 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'react/jsx-runtime'
        }
      }
    }
  }
})

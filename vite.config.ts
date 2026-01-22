import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  // Determine the API Key (Fallback to VITE_ prefix if standard is missing)
  const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || env.API_KEY;

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        'Cross-Origin-Embedder-Policy': 'unsafe-none'
      },
      proxy: {
        '/api/openai': {
          target: 'https://api.openai.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/openai/, '')
        }
      }
    },
    plugins: [react()],
    define: {
      // Ensure process.env.API_KEY is available for the Google GenAI SDK
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey)
    },
    resolve: {
      alias: {
        '@': path.resolve('src'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // React core
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],

            // UI libraries
            'ui-vendor': ['lucide-react', 'sonner'],

            // Markdown and syntax highlighting
            'markdown-vendor': ['react-markdown', 'remark-gfm', 'react-syntax-highlighter'],

            // Firebase
            'firebase-vendor': ['firebase/app', 'firebase/auth'],

            // AI services
            'ai-vendor': ['@google/genai']
          }
        }
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000
    }
  };
});
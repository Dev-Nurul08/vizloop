import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/');
          if (!normalizedId.includes('node_modules')) return undefined;
          if (normalizedId.includes('/three/')) return 'three-vendor';
          if (normalizedId.includes('/monaco-editor/') || normalizedId.includes('/@monaco-editor/')) return 'monaco-vendor';
          if (normalizedId.includes('/lucide-react/')) return 'icons-vendor';
          if (normalizedId.includes('/react/') || normalizedId.includes('/react-dom/')) return 'react-vendor';
          return undefined;
        },
      },
    },
  },
});

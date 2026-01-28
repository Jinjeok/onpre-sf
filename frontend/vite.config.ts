import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const allowedHosts = env.VITE_ALLOWED_HOSTS ? env.VITE_ALLOWED_HOSTS.split(',') : [];

  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_PORT || '5173'),
      host: true, // Listen on all addresses
      allowedHosts: allowedHosts.length > 0 ? allowedHosts : undefined,
      hmr: {
        // If VITE_HMR_HOST is set, use it. Usually the domain (sf.mutsuki.kr)
        host: env.VITE_HMR_HOST || undefined,
        // If behind HTTPS proxy, this should be 443
        clientPort: env.VITE_HMR_CLIENT_PORT ? parseInt(env.VITE_HMR_CLIENT_PORT) : undefined,
        protocol: env.VITE_HMR_PROTOCOL || undefined,
      }
    }
  }
})

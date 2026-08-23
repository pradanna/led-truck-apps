import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'react-dom/client',
            'react/jsx-dev-runtime',
            'react/jsx-runtime',
            '@inertiajs/react',
            'axios', 
            'lucide-react',
            'leaflet',
            'react-leaflet',
        ],
    },
    server: {
        warmup: {
            clientFiles: [
                'resources/js/app.jsx',
                'resources/js/Layouts/AppLayout.jsx',
                'resources/js/Components/Sidebar.jsx',
            ],
        },
    },
});

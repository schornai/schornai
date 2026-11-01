import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    description: 'schorn.ai App',
    display: 'standalone',
    name: 'schorn.ai App',
    short_name: 'schorn.ai App',
    start_url: '/',
  };
}

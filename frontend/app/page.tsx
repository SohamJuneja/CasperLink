'use client';

import dynamic from 'next/dynamic';

// Load the entire Home component client-side only
const HomeComponent = dynamic(() => import('./HomeComponent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl text-white">Loading CasperLink...</div>
    </div>
  ),
});

export default function Home() {
  return <HomeComponent />;
}
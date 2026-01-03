'use client';

import dynamic from 'next/dynamic';

const HowItWorksPage = dynamic(() => import('./HowItWorksComponent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl text-white">Loading...</div>
    </div>
  ),
});

export default HowItWorksPage;


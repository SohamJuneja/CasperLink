'use client';

import dynamic from 'next/dynamic';

const PricesPage = dynamic(() => import('./PricesComponent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl text-white">Loading...</div>
    </div>
  ),
});

export default PricesPage;


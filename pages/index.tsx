
// This page will simply use the Catalog component as the home page.
import dynamic from 'next/dynamic';

const Catalog = dynamic(() => import('@/pages/Catalog'), { ssr: false });

export default function Home() {
  return <Catalog />;
}


import dynamic from 'next/dynamic';

const Catalog = dynamic(() => import('./catalog'), { ssr: false });

export default function Home() {
  return <Catalog />;
}

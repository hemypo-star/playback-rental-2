
import type { AppProps } from 'next/app';
import '../src/index.css'; // Import global styles (adapt as necessary)

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;

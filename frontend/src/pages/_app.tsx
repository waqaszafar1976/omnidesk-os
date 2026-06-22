import '@/styles/tailwind-compiled.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { AppProps } from 'next/app';
import { LocalizedWrapper } from '@/components/layout/LocalizedWrapper';
import '@/i18n/config'; // Import i18n initialization configurations

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LocalizedWrapper>
      <Component {...pageProps} />
    </LocalizedWrapper>
  );
}

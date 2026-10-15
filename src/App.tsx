import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Dashboard } from './components/layout/Dashboard';
import { SuperNotch } from './components/overlay/SuperNotch';
import { PixelRulerOverlay } from './components/overlay/PixelRulerOverlay';
import { TrayMenu } from './components/TrayMenu';
import { useLiquidSync } from './hooks/useLiquidSync';
import { getCurrentWindow } from '@tauri-apps/api/window';

// Determine which view to show based on window label
const windowLabel = getCurrentWindow().label;

function App() {
  useLiquidSync();

  const [view] = useState<'dashboard' | 'tray' | 'notch' | 'ruler'>(
    windowLabel === 'notch' || windowLabel === 'overlay' ? 'notch' :
    windowLabel === 'ruler' ? 'ruler' :
    windowLabel === 'tray' ? 'tray' :
    'dashboard'
  );

  // Global scroll listener: shows sleek scrollbar only while actively scrolling
  useEffect(() => {
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    const handleScroll = () => {
      document.body.classList.add('is-scrolling');
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        document.body.classList.remove('is-scrolling');
      }, 750);
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, []);

  if (view === 'notch') {
    return (
      <div className="w-screen h-screen bg-transparent overflow-hidden flex flex-col items-center">
        <SuperNotch />
      </div>
    );
  }

  if (view === 'tray') {
    return <TrayMenu />;
  }

  if (view === 'ruler') {
    return <PixelRulerOverlay />;
  }

  return (
    <AnimatePresence mode="wait">
      <Dashboard key="dashboard" />
    </AnimatePresence>
  );
}

export default App;

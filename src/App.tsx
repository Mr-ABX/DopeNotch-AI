import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Dashboard } from './components/layout/Dashboard';
import { SuperNotch } from './components/overlay/SuperNotch';
import { PixelRulerOverlay } from './components/overlay/PixelRulerOverlay';
import { ScreenLoupeOverlay } from './components/overlay/ScreenLoupeOverlay';
import { GhostGuideOverlay } from './components/overlay/GhostGuideOverlay';
import { AssetInspectorWindow } from './components/overlay/AssetInspectorWindow';
import { TrayMenu } from './components/TrayMenu';
import { useLiquidSync } from './hooks/useLiquidSync';
import { SAMPLE_SPATIAL_GUIDE_PRESETS } from './services/spatialGuideService';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

// Determine which view to show based on window label
const windowLabel = getCurrentWindow().label;

function App() {
  useLiquidSync();

  const [view] = useState<'dashboard' | 'tray' | 'notch' | 'ruler' | 'inspector'>(
    windowLabel === 'notch' || windowLabel === 'overlay' ? 'notch' :
    windowLabel === 'ruler' ? 'ruler' :
    windowLabel === 'tray' ? 'tray' :
    windowLabel === 'inspector' ? 'inspector' :
    'dashboard'
  );

  const [overlayTool, setOverlayTool] = useState<'ruler' | 'loupe' | 'ghost_guide'>('ruler');
  const [loupeScreenshot, setLoupeScreenshot] = useState<string>('');
  const [ghostGuideTarget, setGhostGuideTarget] = useState<any>(null);
  const [ghostGuideAutoClick, setGhostGuideAutoClick] = useState<boolean>(false);

  useEffect(() => {
    if (view !== 'ruler') return;

    const unlistenLoupe = listen<string>('dopenotch://activate-loupe', (event) => {
      setOverlayTool('loupe');
      if (event.payload) {
        setLoupeScreenshot(event.payload);
      }
    });

    const unlistenGhostGuide = listen<string | null>('dopenotch://activate-ghost-guide', (event) => {
      setOverlayTool('ghost_guide');
      if (event.payload) {
        try {
          let parsed: any;
          if (typeof event.payload === 'string') {
            if ((SAMPLE_SPATIAL_GUIDE_PRESETS as any)[event.payload]) {
              parsed = (SAMPLE_SPATIAL_GUIDE_PRESETS as any)[event.payload];
            } else {
              parsed = JSON.parse(event.payload);
            }
          } else {
            parsed = event.payload;
          }
          setGhostGuideTarget(parsed);
          setGhostGuideAutoClick(Boolean(parsed?.autoClick));
        } catch {
          setGhostGuideTarget(null);
          setGhostGuideAutoClick(false);
        }
      }
    });

    const unlistenRuler = listen('dopenotch://ruler-activated', () => {
      setOverlayTool('ruler');
    });

    return () => {
      unlistenLoupe.then((f) => f());
      unlistenGhostGuide.then((f) => f());
      unlistenRuler.then((f) => f());
    };
  }, [view]);

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
    if (overlayTool === 'loupe') {
      return (
        <ScreenLoupeOverlay
          screenshotUrl={loupeScreenshot}
          onClose={() => invoke('close_loupe')}
        />
      );
    }
    if (overlayTool === 'ghost_guide') {
      return (
        <GhostGuideOverlay
          target={ghostGuideTarget}
          autoClickOnArrival={ghostGuideAutoClick}
          onClose={() => {
            invoke('close_ghost_guide');
            setOverlayTool('ruler');
          }}
        />
      );
    }
    return <PixelRulerOverlay />;
  }

  if (view === 'inspector') {
    return <AssetInspectorWindow />;
  }

  return (
    <AnimatePresence mode="wait">
      <Dashboard key="dashboard" />
    </AnimatePresence>
  );
}

export default App;

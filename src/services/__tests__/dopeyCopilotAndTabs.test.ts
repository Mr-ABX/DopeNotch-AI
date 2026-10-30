import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../stores/appStore';
import { computeCurvedFlightPath, normalizeSpatialBox } from '../spatialGuideService';

describe('Dopey Co-Pilot & New Tabs Store State', () => {
  beforeEach(() => {
    // Reset store state
    useAppStore.setState({
      activeTab: 'welcome',
      isSidebarCollapsed: true,
      orbTheme: 'brand',
    });
  });

  it('defaults isSidebarCollapsed to true', () => {
    const { isSidebarCollapsed } = useAppStore.getState();
    expect(isSidebarCollapsed).toBe(true);
  });

  it('defaults orbTheme to brand amber', () => {
    const { orbTheme } = useAppStore.getState();
    expect(orbTheme).toBe('brand');
  });

  it('allows switching activeTab to scratchpad and copilot', () => {
    const { setActiveTab } = useAppStore.getState();

    setActiveTab('scratchpad');
    expect(useAppStore.getState().activeTab).toBe('scratchpad');

    setActiveTab('copilot');
    expect(useAppStore.getState().activeTab).toBe('copilot');
  });

  it('computes smooth curved Bézier flight path for Ghost Mouse', () => {
    const path = computeCurvedFlightPath(720, 14, 100, 250, 20);
    // When safeSteps = 20, loop runs from 0 to 20 inclusive (21 points)
    expect(path.length).toBe(21);
    expect(path[0].x).toBe(720);
    expect(path[0].y).toBe(14);
    expect(path[path.length - 1].x).toBe(100);
    expect(path[path.length - 1].y).toBe(250);
  });

  it('denormalizes Gemini Vision [0..1000] bounding boxes to display pixels correctly', () => {
    // A box in the middle of a 1920x1080 display: [450, 450, 550, 550]
    const box = normalizeSpatialBox([450, 450, 550, 550], 1920, 1080);
    expect(box.centerX).toBe(960);
    expect(box.centerY).toBe(540);
    expect(box.width).toBe(192);
    expect(box.height).toBe(108);
  });
});

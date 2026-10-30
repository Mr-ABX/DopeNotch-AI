import { describe, it, expect } from 'vitest';
import {
  classifySpatialIntent,
  routeModelForIntent,
  computeCurvedFlightPath,
  normalizeSpatialBox,
  SAMPLE_SPATIAL_GUIDE_PRESETS,
  HOLO_3D_PRESETS,
  DIAGRAM_2D_PRESETS,
} from '../spatialGuideService';

describe('spatialGuideService - Intent Classification', () => {
  it('correctly classifies Spatial Screen Guidance / Ghost Mouse queries', () => {
    expect(classifySpatialIntent('Where is the Pen Tool in Photoshop?')).toBe('spatial_guide');
    expect(classifySpatialIntent('/guide figma export button')).toBe('spatial_guide');
    expect(classifySpatialIntent('/show layers panel')).toBe('spatial_guide');
    expect(classifySpatialIntent('How do I click the export button?')).toBe('spatial_guide');
    expect(classifySpatialIntent('Point to the commit button in VS Code')).toBe('spatial_guide');
    expect(classifySpatialIntent('/spot')).toBe('spatial_guide');
  });

  it('correctly classifies Interactive 3D Holo-Sandbox queries', () => {
    expect(classifySpatialIntent('Show me how a 4-stroke piston works in 3D')).toBe('3d_holo');
    expect(classifySpatialIntent('/3d jet engine turbine')).toBe('3d_holo');
    expect(classifySpatialIntent('/sim planetary orbit')).toBe('3d_holo');
    expect(classifySpatialIntent('Show neural network in 3D')).toBe('3d_holo');
    expect(classifySpatialIntent('rotate model with exploded view')).toBe('3d_holo');
  });

  it('correctly classifies 2D Diagram Canvas queries', () => {
    expect(classifySpatialIntent('/diagram microservices architecture')).toBe('2d_diagram');
    expect(classifySpatialIntent('/graph cloud database setup')).toBe('2d_diagram');
    expect(classifySpatialIntent('/flow OAuth2 PKCE login')).toBe('2d_diagram');
    expect(classifySpatialIntent('Draw a flowchart for user registration')).toBe('2d_diagram');
    expect(classifySpatialIntent('Show React component tree state machine')).toBe('2d_diagram');
  });

  it('correctly falls back to general chat for generic queries', () => {
    expect(classifySpatialIntent('Hello, what time is it?')).toBe('general_chat');
    expect(classifySpatialIntent('Explain quantum entanglement simply')).toBe('general_chat');
  });
});

describe('spatialGuideService - Smart Model Routing', () => {
  it('routes spatial guide to Gemini 3.5 Flash-Lite for sub-400ms coordinates', () => {
    const route = routeModelForIntent('spatial_guide');
    expect(route.modelId).toBe('gemini-3.5-flash-lite');
    expect(route.reason).toContain('Gemini 3.5 Flash-Lite');
  });

  it('routes 2D diagrams to Gemini 3.5 Flash-Lite for instant SVG generation', () => {
    const route = routeModelForIntent('2d_diagram');
    expect(route.modelId).toBe('gemini-3.5-flash-lite');
  });

  it('routes 3D Holo simulations to Gemini 3.6 Flash for high-reasoning 3D geometry', () => {
    const route = routeModelForIntent('3d_holo');
    expect(route.modelId).toBe('gemini-3.6-flash');
    expect(route.reason).toContain('Gemini 3.6 Flash');
  });

  it('retains user selected model for general chat', () => {
    const route = routeModelForIntent('general_chat', 'qwen2.5-0.5b');
    expect(route.modelId).toBe('qwen2.5-0.5b');
  });
});

describe('spatialGuideService - Bézier Flight Physics & Normalization', () => {
  it('computes smooth cubic Bézier flight trajectory from Notch to target', () => {
    const startX = 720;
    const startY = 14;
    const endX = 140;
    const endY = 400;
    const steps = 20;

    const path = computeCurvedFlightPath(startX, startY, endX, endY, steps);
    expect(path).toHaveLength(steps + 1);

    // Initial point must match notch origin
    expect(path[0].x).toBe(startX);
    expect(path[0].y).toBe(startY);
    expect(path[0].progress).toBe(0);

    // Final point must match target destination
    expect(path[path.length - 1].x).toBe(endX);
    expect(path[path.length - 1].y).toBe(endY);
    expect(path[path.length - 1].progress).toBe(1);

    // Midpoints must exist along a smooth curve
    expect(path[10].progress).toBeCloseTo(0.5, 2);
  });

  it('normalizes 0-1000 coordinate bounding boxes into screen pixel dimensions', () => {
    const screenW = 1920;
    const screenH = 1080;
    // Box: ymin=100, xmin=200, ymax=200, xmax=400 (normalized 0-1000)
    const box: [number, number, number, number] = [100, 200, 200, 400];

    const norm = normalizeSpatialBox(box, screenW, screenH);
    expect(norm.x).toBe(Math.round((200 / 1000) * 1920)); // 384
    expect(norm.y).toBe(Math.round((100 / 1000) * 1080)); // 108
    expect(norm.width).toBe(Math.round((200 / 1000) * 1920)); // 384
    expect(norm.height).toBe(Math.round((100 / 1000) * 1080)); // 108
    expect(norm.centerX).toBe(norm.x + norm.width / 2);
    expect(norm.centerY).toBe(norm.y + norm.height / 2);
  });
});

describe('spatialGuideService - 3D & 2D Presets Integrity', () => {
  it('provides 4 high-quality 3D interactive presets with labels and controls', () => {
    expect(HOLO_3D_PRESETS.length).toBeGreaterThanOrEqual(4);

    const ids = HOLO_3D_PRESETS.map((p) => p.id);
    expect(ids).toContain('piston-engine');
    expect(ids).toContain('jet-turbine');
    expect(ids).toContain('solar-orbit');
    expect(ids).toContain('neural-network-3d');

    HOLO_3D_PRESETS.forEach((preset) => {
      expect(preset.title).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.defaultSpeed).toBeGreaterThan(0);
      expect(preset.labels.length).toBeGreaterThan(0);
      expect(typeof preset.setupScene).toBe('function');
    });
  });

  it('provides 3 interactive 2D diagram presets with valid node-edge connectivity', () => {
    expect(DIAGRAM_2D_PRESETS.length).toBeGreaterThanOrEqual(3);

    const ids = DIAGRAM_2D_PRESETS.map((p) => p.id);
    expect(ids).toContain('system-architecture');
    expect(ids).toContain('oauth-flow');
    expect(ids).toContain('git-flow');

    DIAGRAM_2D_PRESETS.forEach((preset) => {
      expect(preset.nodes.length).toBeGreaterThan(0);
      expect(preset.edges.length).toBeGreaterThan(0);

      const nodeIds = new Set(preset.nodes.map((n) => n.id));
      preset.edges.forEach((edge) => {
        expect(nodeIds.has(edge.from)).toBe(true);
        expect(nodeIds.has(edge.to)).toBe(true);
      });
    });
  });

  it('validates offline Ghost Mouse sample targets', () => {
    const penTarget = SAMPLE_SPATIAL_GUIDE_PRESETS.photoshop_pen_tool;
    expect(penTarget).toBeDefined();
    expect(penTarget.shortcut).toBe('P');
    expect(penTarget.steps.length).toBe(3);
    expect(penTarget.steps[0].instruction).toContain('Pen Tool');
  });
});

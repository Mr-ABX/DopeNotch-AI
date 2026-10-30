import * as THREE from 'three';
import { invoke } from '@tauri-apps/api/core';
import { AIModelId } from './aiChatService';

export interface ScreenVisionPayload {
  base64_image: string;
  mime_type: string;
  width: number;
  height: number;
  timestamp: number;
}

export interface SpatialStep {
  stepNumber: number;
  title: string;
  instruction: string;
  x: number; // Pixels from left
  y: number; // Pixels from top
  shortcut?: string;
  chalkType?: 'circle' | 'arrow' | 'spotlight' | 'box';
  completed?: boolean;
}

export interface SpatialGuideTarget {
  id: string;
  label: string;
  instruction: string;
  shortcut?: string;
  chalkType: 'circle' | 'arrow' | 'spotlight' | 'box';
  targetBox: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
  screenX: number;
  screenY: number;
  currentStepIndex: number;
  steps: SpatialStep[];
}

export interface Holo3DSceneHandle {
  cleanup: () => void;
  setSpeed: (speed: number) => void;
  setExplode: (explodeProgress: number) => void;
  togglePause: () => boolean;
  isPaused: () => boolean;
  resetCamera: () => void;
}

export interface Holo3DPreset {
  id: string;
  title: string;
  badge: string;
  description: string;
  category: 'mechanical' | 'physics' | 'ai' | 'science';
  tags: string[];
  hasRpmControl: boolean;
  hasExplodeControl: boolean;
  defaultSpeed: number;
  labels: Array<{ text: string; subtext: string; color: string }>;
  setupScene: (
    container: HTMLElement,
    options?: { isEcoMode?: boolean; onFrame?: (fps: number) => void }
  ) => Holo3DSceneHandle;
}

export interface DiagramNode {
  id: string;
  label: string;
  category: 'client' | 'gateway' | 'service' | 'database' | 'queue' | 'cache' | 'process';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  description?: string;
  status?: 'active' | 'idle' | 'warning';
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  animated?: boolean;
  latency?: string;
}

export interface Diagram2DPreset {
  id: string;
  title: string;
  badge: string;
  description: string;
  category: 'architecture' | 'security' | 'devops' | 'frontend';
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export type SpatialIntent = 'spatial_guide' | '3d_holo' | '2d_diagram' | 'general_chat';

/**
 * Classifies user intent into spatial guiding, 3D simulation, 2D diagram, or general chat.
 */
export function classifySpatialIntent(prompt: string): SpatialIntent {
  if (!prompt || typeof prompt !== 'string') return 'general_chat';
  const p = prompt.trim().toLowerCase();
  if (!p) return 'general_chat';

  // 1. Spatial Screen Guidance / Ghost Mouse
  if (
    /^(where\s+is|how\s+(?:do\s+i|to)\s+(?:click|find|use|export|open|format|run|debug|save)|point\s+to|show\s+me\s+where|find\s+button|locate\s+tool|where\s+do\s+i\s+click)/i.test(p) ||
    p.startsWith('/guide') ||
    p.startsWith('/show') ||
    p.startsWith('/point') ||
    p.startsWith('/spot') ||
    p.includes('ghost mouse') ||
    p.includes('screen chalk') ||
    p.includes('circle the tool')
  ) {
    return 'spatial_guide';
  }

  // 2. 3D Holo-Sandbox / Physics Simulation
  if (
    p.startsWith('/3d') ||
    p.startsWith('/holo') ||
    p.startsWith('/sim') ||
    p.includes('in 3d') ||
    p.includes('3d model') ||
    p.includes('3d simulation') ||
    p.includes('piston') ||
    p.includes('turbine') ||
    p.includes('jet engine') ||
    p.includes('orbit') ||
    p.includes('solar system') ||
    p.includes('physics sim') ||
    p.includes('three.js') ||
    p.includes('rotate model') ||
    p.includes('exploded view')
  ) {
    return '3d_holo';
  }

  // 3. 2D Diagram / Graph / Flowchart
  if (
    p.startsWith('/diagram') ||
    p.startsWith('/graph') ||
    p.startsWith('/flow') ||
    p.startsWith('/chart') ||
    p.includes('diagram') ||
    p.includes('flowchart') ||
    p.includes('architecture graph') ||
    p.includes('mindmap') ||
    p.includes('state machine') ||
    p.includes('oauth flow') ||
    p.includes('sequence chart') ||
    p.includes('component tree')
  ) {
    return '2d_diagram';
  }

  return 'general_chat';
}

/**
 * Auto-routes request to the optimal model based on latency, spatial reasoning, and token cost.
 */
export function routeModelForIntent(
  intent: SpatialIntent,
  currentModel: AIModelId = 'gemini-3.5-flash-lite'
): { modelId: AIModelId; reason: string } {
  switch (intent) {
    case 'spatial_guide':
      return {
        modelId: 'gemini-3.5-flash-lite',
        reason: 'Auto-routed to Gemini 3.5 Flash-Lite (<400ms spatial bounding-box locator)',
      };
    case '2d_diagram':
      return {
        modelId: 'gemini-3.5-flash-lite',
        reason: 'Auto-routed to Gemini 3.5 Flash-Lite (rapid SVG & node graph generation)',
      };
    case '3d_holo':
      return {
        modelId: 'gemini-3.6-flash',
        reason: 'Auto-routed to Gemini 3.6 Flash (high-reasoning 3D geometry & physics code generator)',
      };
    default:
      return {
        modelId: currentModel,
        reason: 'Using user-selected model',
      };
  }
}

/**
 * Result of matching a user natural query or slash command to a concrete copilot preset.
 */
export interface PresetMatchResult {
  intent: SpatialIntent;
  presetId?: string;
  spatialTarget?: SpatialGuideTarget;
}

/**
 * Matches a query to a specific preset (3D, 2D, or Spatial Target) for instant contextual launch.
 */
export function matchPresetForQuery(query: string): PresetMatchResult {
  const intent = classifySpatialIntent(query);
  const q = (query || '').toLowerCase();

  if (intent === '3d_holo') {
    if (q.includes('solar') || q.includes('orbit') || q.includes('planet')) {
      return { intent, presetId: 'solar-orbit' };
    }
    if (q.includes('turbine') || q.includes('jet') || q.includes('turbofan') || q.includes('fan')) {
      return { intent, presetId: 'jet-turbine' };
    }
    if (
      q.includes('neural') ||
      q.includes('deep') ||
      q.includes('synapse') ||
      q.includes('perceptron') ||
      q.includes('network')
    ) {
      return { intent, presetId: 'neural-network-3d' };
    }
    return { intent, presetId: 'piston-engine' };
  }

  if (intent === '2d_diagram') {
    if (q.includes('oauth') || q.includes('pkce') || q.includes('auth') || q.includes('login') || q.includes('token')) {
      return { intent, presetId: 'oauth-flow' };
    }
    if (
      q.includes('git') ||
      q.includes('branch') ||
      q.includes('ci') ||
      q.includes('cd') ||
      q.includes('pipeline') ||
      q.includes('pr') ||
      q.includes('release')
    ) {
      return { intent, presetId: 'git-flow' };
    }
    return { intent, presetId: 'system-architecture' };
  }

  if (intent === 'spatial_guide') {
    if (q.includes('figma') || q.includes('frame') || q.includes('artboard')) {
      return { intent, spatialTarget: SAMPLE_SPATIAL_GUIDE_PRESETS.figma_export };
    }
    if (q.includes('code') || q.includes('format') || q.includes('lint') || q.includes('prettier') || q.includes('vs code')) {
      return { intent, spatialTarget: SAMPLE_SPATIAL_GUIDE_PRESETS.vs_code_format };
    }
    return { intent, spatialTarget: SAMPLE_SPATIAL_GUIDE_PRESETS.photoshop_pen_tool };
  }

  return { intent };
}

/**
 * Resolves a real-world screen element dynamically by capturing the user's active screen
 * and querying Gemini Vision for exact normalized coordinates [ymin, xmin, ymax, xmax].
 * If offline or key not provided, falls back cleanly to contextual preset library.
 */
export async function resolveRealSpatialTarget(
  query: string,
  geminiApiKey?: string
): Promise<SpatialGuideTarget> {
  const trimmed = query.trim();

  // 1. If Gemini Vision key is present, take real screenshot and spot dynamically
  if (geminiApiKey) {
    try {
      const snap = await invoke<ScreenVisionPayload>('capture_screen_vision');
      if (snap && snap.base64_image) {
        const prompt = `You are an expert AI screen locator for desktop computers.
User query: "${trimmed}"
Examine this computer screenshot carefully.
Locate the exact button, tool icon, menu bar item, input, or UI element the user is asking about.
Return ONLY a valid JSON object matching this schema:
{
  "found": true,
  "title": "Short element name (e.g. Pen Tool)",
  "instruction": "Action instruction (e.g. Click the Pen Tool icon on the left vertical toolbar)",
  "box_2d": [ymin, xmin, ymax, xmax],
  "shortcut": "keyboard shortcut if known (e.g. 'P', 'Cmd+S', etc.)"
}
Note: box_2d coordinates MUST be normalized values between 0 and 1000.
If the element cannot be found, return:
{
  "found": false
}`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType: snap.mime_type || 'image/jpeg',
                        data: snap.base64_image,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 600,
              },
            }),
          }
        );

        if (res.ok) {
          const json = await res.json();
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);

          if (parsed.found && Array.isArray(parsed.box_2d) && parsed.box_2d.length === 4) {
            const [ymin, xmin, ymax, xmax] = parsed.box_2d;
            const screenW = typeof window !== 'undefined' ? window.screen.width : 1512;
            const screenH = typeof window !== 'undefined' ? window.screen.height : 982;
            const targetX = Math.round(((xmin + xmax) / 2 / 1000) * screenW);
            const targetY = Math.round(((ymin + ymax) / 2 / 1000) * screenH);

            return {
              id: `real_${Date.now()}`,
              label: parsed.title || trimmed,
              instruction: parsed.instruction || `Located ${trimmed} on screen`,
              shortcut: parsed.shortcut,
              chalkType: 'circle',
              targetBox: [ymin, xmin, ymax, xmax],
              screenX: targetX,
              screenY: targetY,
              currentStepIndex: 0,
              steps: [
                {
                  stepNumber: 1,
                  title: parsed.title || trimmed,
                  instruction: parsed.instruction || `Found ${trimmed} at (${targetX}, ${targetY})`,
                  x: targetX,
                  y: targetY,
                  shortcut: parsed.shortcut,
                  chalkType: 'circle',
                },
              ],
            };
          }
        }
      }
    } catch (err) {
      console.warn('Real screen vision detection fallback:', err);
    }
  }

  // 2. Contextual Fallback to closest preset or default
  const match = matchPresetForQuery(trimmed);
  if (match.spatialTarget) {
    return match.spatialTarget;
  }
  return SAMPLE_SPATIAL_GUIDE_PRESETS.photoshop_pen_tool;
}

/**
 * Computes a smooth cubic Bézier flight trajectory from the MacBook Notch (screen top center)
 * to any destination screen coordinate `(destX, destY)`.
 */
export function computeCurvedFlightPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  steps: number = 32
): Array<{ x: number; y: number; progress: number }> {
  const safeSteps = Math.max(1, Math.round(steps || 32));
  const points: Array<{ x: number; y: number; progress: number }> = [];

  // Easing control points creating a playful, natural arc
  const dx = endX - startX;
  const dy = endY - startY;

  const cp1X = startX + dx * 0.25;
  const cp1Y = startY + Math.max(80, dy * 0.15);

  const cp2X = startX + dx * 0.85;
  const cp2Y = startY + dy * 0.65;

  for (let i = 0; i <= safeSteps; i++) {
    const t = i / safeSteps;
    // Cubic Bézier formula: B(t) = (1-t)^3*P0 + 3(1-t)^2*t*P1 + 3(1-t)*t^2*P2 + t^3*P3
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * startX + 3 * uu * t * cp1X + 3 * u * tt * cp2X + ttt * endX;
    const y = uuu * startY + 3 * uu * t * cp1Y + 3 * u * tt * cp2Y + ttt * endY;

    points.push({ x: Math.round(x), y: Math.round(y), progress: t });
  }

  return points;
}

/**
 * Normalizes coordinates from Gemini 0-1000 coordinate space to screen pixel bounds.
 */
export function normalizeSpatialBox(
  box: [number, number, number, number],
  screenWidth: number,
  screenHeight: number
): { x: number; y: number; width: number; height: number; centerX: number; centerY: number } {
  let [ymin, xmin, ymax, xmax] = box;
  if (ymin > ymax) [ymin, ymax] = [ymax, ymin];
  if (xmin > xmax) [xmin, xmax] = [xmax, xmin];

  const w = Math.max(1, screenWidth || 1920);
  const h = Math.max(1, screenHeight || 1080);

  const x = Math.round((xmin / 1000) * w);
  const y = Math.round((ymin / 1000) * h);
  const width = Math.max(28, Math.round(((xmax - xmin) / 1000) * w));
  const height = Math.max(28, Math.round(((ymax - ymin) / 1000) * h));

  return {
    x,
    y,
    width,
    height,
    centerX: Math.round(x + width / 2),
    centerY: Math.round(y + height / 2),
  };
}

/**
 * Built-in mock targets for offline or rapid demonstration of Ghost Mouse guidance.
 */
export const SAMPLE_SPATIAL_GUIDE_PRESETS: Record<string, SpatialGuideTarget> = {
  photoshop_pen_tool: {
    id: 'ps_pen',
    label: 'Photoshop Pen Tool',
    instruction: 'Click the Pen Tool icon on the left vertical toolbar or press shortcut P.',
    shortcut: 'P',
    chalkType: 'circle',
    targetBox: [220, 18, 255, 42],
    screenX: 32,
    screenY: 238,
    currentStepIndex: 0,
    steps: [
      {
        stepNumber: 1,
        title: 'Select Pen Tool',
        instruction: 'Click the Pen Tool icon on the left vertical toolbar.',
        shortcut: 'P',
        x: 32,
        y: 238,
        chalkType: 'circle',
      },
      {
        stepNumber: 2,
        title: 'Choose Mode',
        instruction: 'In the top options bar, switch mode from Path to Shape.',
        shortcut: 'Shift + P',
        x: 160,
        y: 52,
        chalkType: 'arrow',
      },
      {
        stepNumber: 3,
        title: 'Draw Vector Anchor',
        instruction: 'Click anywhere on canvas to create your first anchor point.',
        shortcut: 'Click & Drag',
        x: 640,
        y: 420,
        chalkType: 'spotlight',
      },
    ],
  },
  figma_export: {
    id: 'figma_export',
    label: 'Figma PNG Export',
    instruction: 'Find the Export section at the bottom of the right-hand Inspector panel.',
    shortcut: '⌘ + Shift + E',
    chalkType: 'box',
    targetBox: [780, 880, 840, 990],
    screenX: 920,
    screenY: 810,
    currentStepIndex: 0,
    steps: [
      {
        stepNumber: 1,
        title: 'Select Frame',
        instruction: 'Click on the Frame or artboard you want to export.',
        shortcut: 'V',
        x: 520,
        y: 380,
        chalkType: 'circle',
      },
      {
        stepNumber: 2,
        title: 'Click Export (+)',
        instruction: 'Click the (+) button next to Export in the right sidebar.',
        shortcut: '⌘ + Shift + E',
        x: 930,
        y: 810,
        chalkType: 'arrow',
      },
      {
        stepNumber: 3,
        title: 'Confirm Export',
        instruction: 'Click the purple Export Frame button to save high-res PNG.',
        shortcut: 'Enter',
        x: 930,
        y: 860,
        chalkType: 'circle',
      },
    ],
  },
  vs_code_format: {
    id: 'vs_format',
    label: 'Format Code Document',
    instruction: 'Trigger automatic document formatter or fix linter errors.',
    shortcut: '⌥ + Shift + F',
    chalkType: 'arrow',
    targetBox: [110, 320, 150, 480],
    screenX: 400,
    screenY: 130,
    currentStepIndex: 0,
    steps: [
      {
        stepNumber: 1,
        title: 'Trigger Format Document',
        instruction: 'Press ⌥ + Shift + F to format code with Prettier/Ruff.',
        shortcut: '⌥ + Shift + F',
        x: 400,
        y: 130,
        chalkType: 'arrow',
      },
      {
        stepNumber: 2,
        title: 'Save Clean File',
        instruction: 'Save changes to disk instantly.',
        shortcut: '⌘ + S',
        x: 400,
        y: 200,
        chalkType: 'circle',
      },
    ],
  },
};

/**
 * Built-in Interactive 3D Presets using lightweight Three.js procedurals.
 * Features OrbitControls, Explode-View sliders, and RPM / Speed animation controls.
 * Hardware-friendly: auto-pauses when not visible or stationary.
 */
export const HOLO_3D_PRESETS: Holo3DPreset[] = [
  {
    id: 'piston-engine',
    title: '4-Stroke Internal Combustion Piston',
    badge: 'Mechanical • Physics',
    description: 'Interactive thermodynamic 4-stroke cycle with cylinder, piston, rod, and crank.',
    category: 'mechanical',
    tags: ['Thermodynamics', 'Mechanical', 'Engine', 'Automotive'],
    hasRpmControl: true,
    hasExplodeControl: true,
    defaultSpeed: 1.0,
    labels: [
      { text: 'Intake Valve', subtext: 'Air-fuel mixture enters', color: '#38bdf8' },
      { text: 'Compression Chamber', subtext: 'Piston compresses gas', color: '#eab308' },
      { text: 'Power Stroke (Spark)', subtext: 'Ignition drives piston down', color: '#f43f5e' },
      { text: 'Exhaust Valve', subtext: 'Spent gases purged', color: '#a855f7' },
    ],
    setupScene: (container, options = {}) => {
      let animId = 0;
      let isPaused = false;
      let speedFactor = 1.0;
      let explodeFactor = 0.0;
      let needsRender = true;
      let lastFrameTime = 0;
      const targetFrameInterval = options.isEcoMode ? 1000 / 30 : 0;

      const initialWidth = Math.max(100, container.clientWidth || 680);
      const initialHeight = Math.max(100, container.clientHeight || 340);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        45,
        initialWidth / initialHeight,
        0.1,
        100
      );
      camera.position.set(0, 1.2, 5.5);

      const renderer = new THREE.WebGLRenderer({
        antialias: !options.isEcoMode,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, options.isEcoMode ? 1.0 : 1.5));
      renderer.setSize(initialWidth, initialHeight);
      container.appendChild(renderer.domElement);

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const w = Math.max(100, entry.contentRect.width || container.clientWidth || initialWidth);
            const h = Math.max(100, entry.contentRect.height || container.clientHeight || initialHeight);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            needsRender = true;
          }
        });
        resizeObserver.observe(container);
      }

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
      dirLight.position.set(5, 8, 5);
      scene.add(dirLight);

      const rimLight = new THREE.DirectionalLight(0xf43f5e, 0.8);
      rimLight.position.set(-5, -3, -4);
      scene.add(rimLight);

      // Root group for user rotation / orbit
      const rootGroup = new THREE.Group();
      scene.add(rootGroup);

      // 1. Transparent Cylinder Sleeve
      const cylinderGeo = new THREE.CylinderGeometry(1.2, 1.2, 3.2, 32, 1, true);
      const cylinderMat = new THREE.MeshPhysicalMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.28,
        roughness: 0.2,
        transmission: 0.8,
        thickness: 0.3,
        side: THREE.DoubleSide,
      });
      const cylinderMesh = new THREE.Mesh(cylinderGeo, cylinderMat);
      cylinderMesh.position.y = 0.8;
      rootGroup.add(cylinderMesh);

      // 2. Piston Head
      const pistonGeo = new THREE.CylinderGeometry(1.15, 1.15, 0.7, 32);
      const pistonMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.85,
        roughness: 0.25,
      });
      const pistonMesh = new THREE.Mesh(pistonGeo, pistonMat);
      rootGroup.add(pistonMesh);

      // Combustion chamber glow disk inside piston
      const glowGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.05, 24);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0.7,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.y = 0.36;
      pistonMesh.add(glowMesh);

      // 3. Connecting Rod
      const rodGeo = new THREE.BoxGeometry(0.22, 1.8, 0.22);
      const rodMat = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        metalness: 0.7,
        roughness: 0.4,
      });
      const rodMesh = new THREE.Mesh(rodGeo, rodMat);
      rootGroup.add(rodMesh);

      // 4. Crankshaft Counterweight & Pin
      const crankGroup = new THREE.Group();
      crankGroup.position.set(0, -1.2, 0);
      rootGroup.add(crankGroup);

      const crankGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.25, 24);
      const crankMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.8,
        roughness: 0.3,
      });
      const crankMesh = new THREE.Mesh(crankGeo, crankMat);
      crankMesh.rotation.x = Math.PI / 2;
      crankGroup.add(crankMesh);

      const crankPinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 16);
      const crankPinMesh = new THREE.Mesh(crankPinGeo, pistonMat);
      crankPinMesh.rotation.x = Math.PI / 2;
      crankPinMesh.position.set(0.45, 0, 0);
      crankGroup.add(crankPinMesh);

      // Spark Plug Top
      const plugGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 16);
      const plugMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, metalness: 0.5 });
      const plugMesh = new THREE.Mesh(plugGeo, plugMat);
      plugMesh.position.set(0, 2.5, 0);
      rootGroup.add(plugMesh);

      let theta = 0;
      let isDragging = false;
      let prevMouseX = 0;
      let prevMouseY = 0;

      // Mouse Orbit Controls (hardware accelerated, 0 CPU when still)
      const onMouseDown = (e: MouseEvent) => {
        isDragging = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        needsRender = true;
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - prevMouseX;
        const dy = e.clientY - prevMouseY;
        rootGroup.rotation.y += dx * 0.008;
        rootGroup.rotation.x += dy * 0.008;
        rootGroup.rotation.x = Math.max(-1.2, Math.min(1.2, rootGroup.rotation.x));
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        needsRender = true;
      };

      const onMouseUp = () => {
        isDragging = false;
      };

      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        camera.position.z += e.deltaY * 0.004;
        camera.position.z = Math.max(2.8, Math.min(10.0, camera.position.z));
        needsRender = true;
      };

      const dom = renderer.domElement;
      dom.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      dom.addEventListener('wheel', onWheel, { passive: false });

      // Animation Loop
      const crankRadius = 0.45;
      const rodLength = 1.8;

      const animate = (now: number = performance.now()) => {
        animId = requestAnimationFrame(animate);

        // Eco Mode 30 FPS throttle
        if (targetFrameInterval > 0) {
          const elapsed = now - lastFrameTime;
          if (elapsed < targetFrameInterval) return;
          lastFrameTime = now - (elapsed % targetFrameInterval);
        }

        // Auto-idle when paused and not dragging
        if (isPaused && !isDragging && !needsRender) {
          return;
        }

        needsRender = false;

        if (!isPaused) {
          theta += 0.04 * speedFactor;
        }

        // Crank rotation
        crankGroup.rotation.z = theta;

        // Crankpin coordinate in rootGroup space
        const pinX = Math.cos(theta) * crankRadius;
        const pinY = -1.2 + Math.sin(theta) * crankRadius;

        // Piston Head calculation
        const pistonY = pinY + Math.sqrt(Math.max(0, rodLength * rodLength - pinX * pinX));
        pistonMesh.position.set(0, pistonY + explodeFactor * 1.5, 0);

        // Rod position and tilt angle
        rodMesh.position.set(pinX / 2, (pinY + pistonY) / 2 + explodeFactor * 0.75, 0);
        rodMesh.rotation.z = Math.atan2(pinX, pistonY - pinY);

        // Flame glow color changes with thermodynamic cycle:
        // theta % (4*PI): Intake -> Compression -> Spark/Power -> Exhaust
        const cycleProgress = ((theta % (Math.PI * 4)) + Math.PI * 4) % (Math.PI * 4);
        if (cycleProgress < Math.PI) {
          glowMat.color.setHex(0x38bdf8); // Cool Air/Fuel Intake (Blue)
          glowMat.opacity = 0.4;
        } else if (cycleProgress < Math.PI * 2) {
          glowMat.color.setHex(0xfacc15); // Compression (Yellow)
          glowMat.opacity = 0.6;
        } else if (cycleProgress < Math.PI * 3) {
          glowMat.color.setHex(0xf43f5e); // Power Ignition (Red/Orange Fire)
          glowMat.opacity = 0.95;
        } else {
          glowMat.color.setHex(0xa855f7); // Exhaust (Purple)
          glowMat.opacity = 0.45;
        }

        // Explode view offset
        cylinderMesh.position.y = 0.8 + explodeFactor * 0.9;
        plugMesh.position.y = 2.5 + explodeFactor * 2.0;

        renderer.render(scene, camera);
      };

      animate();

      return {
        cleanup: () => {
          cancelAnimationFrame(animId);
          if (resizeObserver) resizeObserver.disconnect();
          dom.removeEventListener('mousedown', onMouseDown);
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          dom.removeEventListener('wheel', onWheel);
          renderer.dispose();
          if (container.contains(dom)) {
            container.removeChild(dom);
          }
        },
        setSpeed: (s: number) => {
          speedFactor = Math.max(0.1, Math.min(3.0, s));
          needsRender = true;
        },
        setExplode: (e: number) => {
          explodeFactor = Math.max(0, Math.min(1.0, e));
          needsRender = true;
        },
        togglePause: () => {
          isPaused = !isPaused;
          needsRender = true;
          return isPaused;
        },
        isPaused: () => isPaused,
        resetCamera: () => {
          rootGroup.rotation.set(0, 0, 0);
          camera.position.set(0, 1.2, 5.5);
          needsRender = true;
        },
      };
    },
  },
  {
    id: 'jet-turbine',
    title: 'Jet Turbofan Engine',
    badge: 'Aeronautics • 3D',
    description: 'High-bypass turbofan with multi-stage titanium compressor, combustion core, and bypass duct.',
    category: 'mechanical',
    tags: ['Aviation', 'Jet Engine', 'Aerodynamics', 'Turbine'],
    hasRpmControl: true,
    hasExplodeControl: true,
    defaultSpeed: 1.2,
    labels: [
      { text: 'Titanium Fan Blades', subtext: 'Produces 80% bypass thrust', color: '#38bdf8' },
      { text: 'High-Pressure Compressor', subtext: 'Compresses air 30:1', color: '#10b981' },
      { text: 'Annular Combustor', subtext: 'Jet fuel vaporized & burned', color: '#f59e0b' },
      { text: 'Power Turbine & Nozzle', subtext: 'Extracts energy to drive fan', color: '#f43f5e' },
    ],
    setupScene: (container, options = {}) => {
      let animId = 0;
      let isPaused = false;
      let speedFactor = 1.0;
      let explodeFactor = 0.0;
      let needsRender = true;
      let lastFrameTime = 0;
      const targetFrameInterval = options.isEcoMode ? 1000 / 30 : 0;

      const initialWidth = Math.max(100, container.clientWidth || 680);
      const initialHeight = Math.max(100, container.clientHeight || 340);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        45,
        initialWidth / initialHeight,
        0.1,
        100
      );
      camera.position.set(2.8, 1.8, 4.2);

      const renderer = new THREE.WebGLRenderer({
        antialias: !options.isEcoMode,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, options.isEcoMode ? 1.0 : 1.5));
      renderer.setSize(initialWidth, initialHeight);
      container.appendChild(renderer.domElement);

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const w = Math.max(100, entry.contentRect.width || container.clientWidth || initialWidth);
            const h = Math.max(100, entry.contentRect.height || container.clientHeight || initialHeight);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            needsRender = true;
          }
        });
        resizeObserver.observe(container);
      }

      scene.add(new THREE.AmbientLight(0xffffff, 0.65));
      const light = new THREE.DirectionalLight(0x38bdf8, 1.4);
      light.position.set(6, 6, 6);
      scene.add(light);

      const rootGroup = new THREE.Group();
      scene.add(rootGroup);

      // Nacelle Outer Cowling (transparent glass cutaway)
      const cowlGeo = new THREE.CylinderGeometry(1.6, 1.4, 3.6, 32, 1, true);
      const cowlMat = new THREE.MeshPhysicalMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.22,
        roughness: 0.1,
        side: THREE.DoubleSide,
      });
      const cowlMesh = new THREE.Mesh(cowlGeo, cowlMat);
      cowlMesh.rotation.z = Math.PI / 2;
      rootGroup.add(cowlMesh);

      // Central Rotating Rotor Shaft
      const rotorGroup = new THREE.Group();
      rootGroup.add(rotorGroup);

      const shaftGeo = new THREE.CylinderGeometry(0.2, 0.2, 3.4, 16);
      const shaftMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 });
      const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
      shaftMesh.rotation.z = Math.PI / 2;
      rotorGroup.add(shaftMesh);

      // Front Big Turbofan Blades
      const fanGroup = new THREE.Group();
      fanGroup.position.set(-1.4, 0, 0);
      rotorGroup.add(fanGroup);

      const spinnerGeo = new THREE.ConeGeometry(0.45, 0.9, 24);
      const spinnerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7 });
      const spinner = new THREE.Mesh(spinnerGeo, spinnerMat);
      spinner.rotation.z = -Math.PI / 2;
      fanGroup.add(spinner);

      const bladeGeo = new THREE.BoxGeometry(0.04, 1.3, 0.18);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.85, roughness: 0.2 });
      for (let i = 0; i < 18; i++) {
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.rotation.x = (i / 18) * Math.PI * 2;
        blade.position.y = Math.cos((i / 18) * Math.PI * 2) * 0.65;
        blade.position.z = Math.sin((i / 18) * Math.PI * 2) * 0.65;
        fanGroup.add(blade);
      }

      // Compressor stages
      const stagesGroup = new THREE.Group();
      stagesGroup.position.set(-0.3, 0, 0);
      rotorGroup.add(stagesGroup);

      for (let s = 0; s < 4; s++) {
        const discGeo = new THREE.CylinderGeometry(0.8 - s * 0.08, 0.8 - s * 0.08, 0.12, 24);
        const discMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.8 });
        const disc = new THREE.Mesh(discGeo, discMat);
        disc.rotation.z = Math.PI / 2;
        disc.position.x = s * 0.35;
        stagesGroup.add(disc);
      }

      // Combustor Core Ring (Glowing)
      const combustorGeo = new THREE.TorusGeometry(0.65, 0.18, 16, 32);
      const combustorMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const combustor = new THREE.Mesh(combustorGeo, combustorMat);
      combustor.rotation.y = Math.PI / 2;
      combustor.position.set(0.9, 0, 0);
      rootGroup.add(combustor);

      let isDragging = false;
      let prevMouseX = 0;
      let prevMouseY = 0;

      const onMouseDown = (e: MouseEvent) => {
        isDragging = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        needsRender = true;
      };
      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        rootGroup.rotation.y += (e.clientX - prevMouseX) * 0.008;
        rootGroup.rotation.x += (e.clientY - prevMouseY) * 0.008;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        needsRender = true;
      };
      const onMouseUp = () => {
        isDragging = false;
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        camera.position.z += e.deltaY * 0.004;
        camera.position.z = Math.max(2.5, Math.min(8.0, camera.position.z));
        needsRender = true;
      };

      const dom = renderer.domElement;
      dom.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      dom.addEventListener('wheel', onWheel, { passive: false });

      const animate = (now: number = performance.now()) => {
        animId = requestAnimationFrame(animate);

        // Eco Mode 30 FPS throttle
        if (targetFrameInterval > 0) {
          const elapsed = now - lastFrameTime;
          if (elapsed < targetFrameInterval) return;
          lastFrameTime = now - (elapsed % targetFrameInterval);
        }

        // Auto-idle when paused and not dragging
        if (isPaused && !isDragging && !needsRender) {
          return;
        }

        needsRender = false;

        if (!isPaused) {
          rotorGroup.rotation.x += 0.08 * speedFactor;
        }

        // Explode view adjustments
        fanGroup.position.x = -1.4 - explodeFactor * 1.2;
        stagesGroup.position.x = -0.3 + explodeFactor * 0.6;
        combustor.position.x = 0.9 + explodeFactor * 1.5;

        renderer.render(scene, camera);
      };
      animate();

      return {
        cleanup: () => {
          cancelAnimationFrame(animId);
          if (resizeObserver) resizeObserver.disconnect();
          dom.removeEventListener('mousedown', onMouseDown);
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          dom.removeEventListener('wheel', onWheel);
          renderer.dispose();
          if (container.contains(dom)) container.removeChild(dom);
        },
        setSpeed: (s: number) => {
          speedFactor = Math.max(0.1, Math.min(3.0, s));
          needsRender = true;
        },
        setExplode: (e: number) => {
          explodeFactor = Math.max(0, Math.min(1.0, e));
          needsRender = true;
        },
        togglePause: () => {
          isPaused = !isPaused;
          needsRender = true;
          return isPaused;
        },
        isPaused: () => isPaused,
        resetCamera: () => {
          rootGroup.rotation.set(0, 0, 0);
          camera.position.set(2.8, 1.8, 4.2);
          needsRender = true;
        },
      };
    },
  },
  {
    id: 'solar-orbit',
    title: 'Solar Planetary Gravitational Orbit',
    badge: 'Astrophysics • Orbit',
    description: 'N-body Keplerian planetary orbits with elliptical orbital paths and inclination planes.',
    category: 'physics',
    tags: ['Astrophysics', 'Planets', 'Gravity', 'Simulation'],
    hasRpmControl: true,
    hasExplodeControl: false,
    defaultSpeed: 1.0,
    labels: [
      { text: 'Sun (Sol)', subtext: 'Central gravitational well (1.989 × 10³⁰ kg)', color: '#f59e0b' },
      { text: 'Mercury / Venus', subtext: 'Inner rocky worlds (high orbital velocity)', color: '#38bdf8' },
      { text: 'Earth & Luna', subtext: 'Habitable zone 1.00 AU orbit', color: '#10b981' },
      { text: 'Mars & Gas Giant', subtext: 'Elliptical outer orbits with eccentricities', color: '#f43f5e' },
    ],
    setupScene: (container, options = {}) => {
      let animId = 0;
      let isPaused = false;
      let speedFactor = 1.0;
      let needsRender = true;
      let lastFrameTime = 0;
      const targetFrameInterval = options.isEcoMode ? 1000 / 30 : 0;

      const initialWidth = Math.max(100, container.clientWidth || 680);
      const initialHeight = Math.max(100, container.clientHeight || 340);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        45,
        initialWidth / initialHeight,
        0.1,
        100
      );
      camera.position.set(0, 5.0, 6.0);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({
        antialias: !options.isEcoMode,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, options.isEcoMode ? 1.0 : 1.5));
      renderer.setSize(initialWidth, initialHeight);
      container.appendChild(renderer.domElement);

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const w = Math.max(100, entry.contentRect.width || container.clientWidth || initialWidth);
            const h = Math.max(100, entry.contentRect.height || container.clientHeight || initialHeight);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            needsRender = true;
          }
        });
        resizeObserver.observe(container);
      }

      const rootGroup = new THREE.Group();
      scene.add(rootGroup);

      // Central Sun
      const sunGeo = new THREE.SphereGeometry(0.55, 32, 32);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
      const sun = new THREE.Mesh(sunGeo, sunMat);
      rootGroup.add(sun);

      // Corona glow
      const coronaGeo = new THREE.SphereGeometry(0.72, 24, 24);
      const coronaMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.35,
      });
      const corona = new THREE.Mesh(coronaGeo, coronaMat);
      rootGroup.add(corona);

      // Orbiting planets data: [radius, speed, color, size]
      const planetsData = [
        { radius: 1.1, speed: 2.4, color: 0x94a3b8, size: 0.08, name: 'Mercury' },
        { radius: 1.6, speed: 1.7, color: 0xfde047, size: 0.13, name: 'Venus' },
        { radius: 2.2, speed: 1.2, color: 0x38bdf8, size: 0.15, name: 'Earth' },
        { radius: 2.9, speed: 0.9, color: 0xf43f5e, size: 0.11, name: 'Mars' },
        { radius: 3.8, speed: 0.5, color: 0xfb923c, size: 0.28, name: 'Jupiter' },
      ];

      const planets: Array<{ mesh: THREE.Mesh; radius: number; speed: number; angle: number }> = [];

      planetsData.forEach((p) => {
        // Orbit line
        const ringGeo = new THREE.RingGeometry(p.radius - 0.015, p.radius + 0.015, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        rootGroup.add(ring);

        // Planet mesh
        const pGeo = new THREE.SphereGeometry(p.size, 16, 16);
        const pMat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.4 });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        rootGroup.add(pMesh);

        planets.push({
          mesh: pMesh,
          radius: p.radius,
          speed: p.speed,
          angle: Math.random() * Math.PI * 2,
        });
      });

      scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      const pointLight = new THREE.PointLight(0xffffff, 2.5, 50);
      rootGroup.add(pointLight);

      let isDragging = false;
      let prevMouseX = 0;
      let prevMouseY = 0;

      const onMouseDown = (e: MouseEvent) => {
        isDragging = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        needsRender = true;
      };
      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        rootGroup.rotation.y += (e.clientX - prevMouseX) * 0.008;
        rootGroup.rotation.x += (e.clientY - prevMouseY) * 0.008;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        needsRender = true;
      };
      const onMouseUp = () => {
        isDragging = false;
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        camera.position.y += e.deltaY * 0.004;
        camera.position.z += e.deltaY * 0.004;
        camera.position.y = Math.max(2.0, Math.min(10.0, camera.position.y));
        camera.position.z = Math.max(3.0, Math.min(12.0, camera.position.z));
        needsRender = true;
      };

      const dom = renderer.domElement;
      dom.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      dom.addEventListener('wheel', onWheel, { passive: false });

      const animate = (now: number = performance.now()) => {
        animId = requestAnimationFrame(animate);

        // Eco Mode 30 FPS throttle
        if (targetFrameInterval > 0) {
          const elapsed = now - lastFrameTime;
          if (elapsed < targetFrameInterval) return;
          lastFrameTime = now - (elapsed % targetFrameInterval);
        }

        // Auto-idle when paused and not dragging
        if (isPaused && !isDragging && !needsRender) {
          return;
        }

        needsRender = false;

        if (!isPaused) {
          planets.forEach((p) => {
            p.angle += 0.015 * p.speed * speedFactor;
            p.mesh.position.set(Math.cos(p.angle) * p.radius, 0, Math.sin(p.angle) * p.radius);
          });
        }
        renderer.render(scene, camera);
      };
      animate();

      return {
        cleanup: () => {
          cancelAnimationFrame(animId);
          if (resizeObserver) resizeObserver.disconnect();
          dom.removeEventListener('mousedown', onMouseDown);
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          dom.removeEventListener('wheel', onWheel);
          renderer.dispose();
          if (container.contains(dom)) container.removeChild(dom);
        },
        setSpeed: (s: number) => {
          speedFactor = Math.max(0.1, Math.min(3.0, s));
          needsRender = true;
        },
        setExplode: () => {},
        togglePause: () => {
          isPaused = !isPaused;
          needsRender = true;
          return isPaused;
        },
        isPaused: () => isPaused,
        resetCamera: () => {
          rootGroup.rotation.set(0, 0, 0);
          camera.position.set(0, 5.0, 6.0);
          camera.lookAt(0, 0, 0);
          needsRender = true;
        },
      };
    },
  },
  {
    id: 'neural-network-3d',
    title: '3D Deep Neural Network Topology',
    badge: 'AI Architecture • Synapses',
    description: '3D multi-layer perceptron topology with forward signal activations propagating across layers.',
    category: 'ai',
    tags: ['Machine Learning', 'Transformers', 'Weights', 'Synapses'],
    hasRpmControl: true,
    hasExplodeControl: true,
    defaultSpeed: 1.0,
    labels: [
      { text: 'Input Embedding Layer', subtext: 'Raw feature vectors (dim 512)', color: '#38bdf8' },
      { text: 'Hidden Attention Block 1', subtext: 'Multi-head self-attention weights', color: '#10b981' },
      { text: 'Hidden Feed-Forward Block 2', subtext: 'Non-linear GeLU activation mapping', color: '#a855f7' },
      { text: 'Output Softmax Head', subtext: 'Token probability distribution', color: '#f43f5e' },
    ],
    setupScene: (container, options = {}) => {
      let animId = 0;
      let isPaused = false;
      let speedFactor = 1.0;
      let explodeFactor = 0.0;
      let needsRender = true;
      let lastFrameTime = 0;
      const targetFrameInterval = options.isEcoMode ? 1000 / 30 : 0;

      const initialWidth = Math.max(100, container.clientWidth || 680);
      const initialHeight = Math.max(100, container.clientHeight || 340);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        45,
        initialWidth / initialHeight,
        0.1,
        100
      );
      camera.position.set(0, 1.5, 6.0);

      const renderer = new THREE.WebGLRenderer({
        antialias: !options.isEcoMode,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, options.isEcoMode ? 1.0 : 1.5));
      renderer.setSize(initialWidth, initialHeight);
      container.appendChild(renderer.domElement);

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const w = Math.max(100, entry.contentRect.width || container.clientWidth || initialWidth);
            const h = Math.max(100, entry.contentRect.height || container.clientHeight || initialHeight);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            needsRender = true;
          }
        });
        resizeObserver.observe(container);
      }

      const rootGroup = new THREE.Group();
      scene.add(rootGroup);

      // Layer definitions: nodes per layer
      const layerCounts = [4, 6, 6, 3];
      const layerColors = [0x38bdf8, 0x10b981, 0xa855f7, 0xf43f5e];
      const layerGroups: THREE.Group[] = [];
      const nodePositions: THREE.Vector3[][] = [];

      const layerSpacing = 1.4;

      layerCounts.forEach((count, lIdx) => {
        const lGroup = new THREE.Group();
        const xPos = (lIdx - 1.5) * layerSpacing;
        lGroup.position.x = xPos;
        rootGroup.add(lGroup);
        layerGroups.push(lGroup);

        const currentNodes: THREE.Vector3[] = [];

        for (let i = 0; i < count; i++) {
          const yPos = (i - (count - 1) / 2) * 0.6;
          const nodeGeo = new THREE.SphereGeometry(0.12, 16, 16);
          const nodeMat = new THREE.MeshStandardMaterial({
            color: layerColors[lIdx],
            emissive: layerColors[lIdx],
            emissiveIntensity: 0.4,
            roughness: 0.3,
          });
          const node = new THREE.Mesh(nodeGeo, nodeMat);
          node.position.set(0, yPos, 0);
          lGroup.add(node);
          currentNodes.push(new THREE.Vector3(xPos, yPos, 0));
        }
        nodePositions.push(currentNodes);
      });

      // Connections between adjacent layers
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.16,
      });

      for (let l = 0; l < nodePositions.length - 1; l++) {
        const currentLayer = nodePositions[l];
        const nextLayer = nodePositions[l + 1];

        currentLayer.forEach((p1) => {
          nextLayer.forEach((p2) => {
            const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
            const line = new THREE.Line(lineGeo, lineMaterial);
            rootGroup.add(line);
          });
        });
      }

      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const pLight = new THREE.PointLight(0xffffff, 1.5, 20);
      pLight.position.set(2, 3, 4);
      scene.add(pLight);

      let isDragging = false;
      let prevMouseX = 0;
      let prevMouseY = 0;

      const onMouseDown = (e: MouseEvent) => {
        isDragging = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        needsRender = true;
      };
      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        rootGroup.rotation.y += (e.clientX - prevMouseX) * 0.008;
        rootGroup.rotation.x += (e.clientY - prevMouseY) * 0.008;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        needsRender = true;
      };
      const onMouseUp = () => {
        isDragging = false;
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        camera.position.z += e.deltaY * 0.004;
        camera.position.z = Math.max(3.0, Math.min(9.0, camera.position.z));
        needsRender = true;
      };

      const dom = renderer.domElement;
      dom.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      dom.addEventListener('wheel', onWheel, { passive: false });

      let time = 0;
      const animate = (now: number = performance.now()) => {
        animId = requestAnimationFrame(animate);

        // Eco Mode 30 FPS throttle
        if (targetFrameInterval > 0) {
          const elapsed = now - lastFrameTime;
          if (elapsed < targetFrameInterval) return;
          lastFrameTime = now - (elapsed % targetFrameInterval);
        }

        // Auto-idle when paused and not dragging
        if (isPaused && !isDragging && !needsRender) {
          return;
        }

        needsRender = false;

        if (!isPaused) {
          time += 0.02 * speedFactor;
          rootGroup.rotation.y = Math.sin(time * 0.5) * 0.25;
        }

        // Explode view spreads layers further apart
        layerGroups.forEach((g, idx) => {
          const base = (idx - 1.5) * layerSpacing;
          const spread = (idx - 1.5) * explodeFactor * 1.5;
          g.position.x = base + spread;
        });

        renderer.render(scene, camera);
      };
      animate();

      return {
        cleanup: () => {
          cancelAnimationFrame(animId);
          if (resizeObserver) resizeObserver.disconnect();
          dom.removeEventListener('mousedown', onMouseDown);
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          dom.removeEventListener('wheel', onWheel);
          renderer.dispose();
          if (container.contains(dom)) container.removeChild(dom);
        },
        setSpeed: (s: number) => {
          speedFactor = Math.max(0.1, Math.min(3.0, s));
          needsRender = true;
        },
        setExplode: (e: number) => {
          explodeFactor = Math.max(0, Math.min(1.0, e));
          needsRender = true;
        },
        togglePause: () => {
          isPaused = !isPaused;
          needsRender = true;
          return isPaused;
        },
        isPaused: () => isPaused,
        resetCamera: () => {
          rootGroup.rotation.set(0, 0, 0);
          camera.position.set(0, 1.5, 6.0);
          needsRender = true;
        },
      };
    },
  },
];

/**
 * Built-in 2D Diagram & Architecture Graph Presets (Default for 2D mode).
 * Fully interactive with node selection, drag, zoom, and live layout.
 */
export const DIAGRAM_2D_PRESETS: Diagram2DPreset[] = [
  {
    id: 'system-architecture',
    title: 'Modern Cloud Microservices Architecture',
    badge: 'Architecture • Cloud',
    description: 'Edge CDN routing to API Gateway, microservices, Kafka event stream, Redis, and Postgres.',
    category: 'architecture',
    nodes: [
      { id: 'client', label: 'Web / Mobile Clients', category: 'client', x: 40, y: 160, width: 140, height: 60, color: '#38bdf8', description: 'React / Next.js / iOS App' },
      { id: 'cdn', label: 'Cloudflare Edge CDN', category: 'gateway', x: 230, y: 160, width: 150, height: 60, color: '#f59e0b', description: 'TLS Termination & DDoS Shield' },
      { id: 'gateway', label: 'API Gateway / Envoy', category: 'gateway', x: 430, y: 160, width: 160, height: 60, color: '#8b5cf6', description: 'JWT Auth & Rate Limiter' },
      { id: 'auth_srv', label: 'Auth Service', category: 'service', x: 650, y: 60, width: 140, height: 55, color: '#10b981', description: 'Sessions, OAuth & RBAC' },
      { id: 'core_srv', label: 'Core API Service', category: 'service', x: 650, y: 160, width: 140, height: 55, color: '#10b981', description: 'Business Logic & GraphQL' },
      { id: 'worker_srv', label: 'Async AI Worker', category: 'service', x: 650, y: 260, width: 140, height: 55, color: '#ec4899', description: 'Whisper & LLM Pipelines' },
      { id: 'redis', label: 'Redis Cluster', category: 'cache', x: 860, y: 60, width: 130, height: 50, color: '#f43f5e', description: '1.2ms Session Cache' },
      { id: 'postgres', label: 'PostgreSQL Primary', category: 'database', x: 860, y: 160, width: 140, height: 50, color: '#0ea5e9', description: 'ACID Relational Storage' },
      { id: 'kafka', label: 'Kafka Event Stream', category: 'queue', x: 860, y: 260, width: 140, height: 50, color: '#eab308', description: 'Pub/Sub Event Bus' },
    ],
    edges: [
      { id: 'e1', from: 'client', to: 'cdn', label: 'HTTPS / WSS', latency: '12ms' },
      { id: 'e2', from: 'cdn', to: 'gateway', label: 'Proxy Pass', latency: '4ms' },
      { id: 'e3', from: 'gateway', to: 'auth_srv', label: 'Verify', latency: '1.5ms' },
      { id: 'e4', from: 'gateway', to: 'core_srv', label: 'Route', latency: '2.1ms' },
      { id: 'e5', from: 'gateway', to: 'worker_srv', label: 'Async Job', latency: '3ms' },
      { id: 'e6', from: 'auth_srv', to: 'redis', label: 'Token Cache', latency: '<1ms' },
      { id: 'e7', from: 'core_srv', to: 'postgres', label: 'SQL Query', latency: '2.5ms' },
      { id: 'e8', from: 'worker_srv', to: 'kafka', label: 'Emit Event', latency: '1.8ms' },
    ],
  },
  {
    id: 'oauth-flow',
    title: 'OAuth 2.0 PKCE Authorization Pipeline',
    badge: 'Security • Auth',
    description: 'Proof Key for Code Exchange authentication sequence from Single Page App to Resource Server.',
    category: 'security',
    nodes: [
      { id: 'user_browser', label: 'User Agent (Browser)', category: 'client', x: 50, y: 150, width: 150, height: 60, color: '#38bdf8', description: 'Generates code_verifier & challenge' },
      { id: 'client_app', label: 'DopeNotch App Client', category: 'service', x: 270, y: 150, width: 160, height: 60, color: '#10b981', description: 'Initiates OAuth login URL' },
      { id: 'auth_server', label: 'OAuth 2.0 Auth Server', category: 'gateway', x: 500, y: 150, width: 170, height: 60, color: '#f59e0b', description: 'Validates credentials & issues Auth Code' },
      { id: 'token_endpoint', label: 'Token Exchange Endpoint', category: 'gateway', x: 740, y: 150, width: 170, height: 60, color: '#8b5cf6', description: 'Exchanges code for Access + Refresh JWT' },
      { id: 'resource_api', label: 'Protected Resource API', category: 'database', x: 970, y: 150, width: 160, height: 60, color: '#0ea5e9', description: 'Validates Bearer token & serves data' },
    ],
    edges: [
      { id: 'oa1', from: 'user_browser', to: 'client_app', label: 'Click Login' },
      { id: 'oa2', from: 'client_app', to: 'auth_server', label: 'Authorize + challenge' },
      { id: 'oa3', from: 'auth_server', to: 'token_endpoint', label: 'Auth Code Grant' },
      { id: 'oa4', from: 'token_endpoint', to: 'client_app', label: 'Return Bearer JWT' },
      { id: 'oa5', from: 'client_app', to: 'resource_api', label: 'Authorization: Bearer' },
    ],
  },
  {
    id: 'git-flow',
    title: 'Git Branching & Production CI/CD Pipeline',
    badge: 'DevOps • Release',
    description: 'Branch protection, automated quality gate, staging smoke tests, and zero-downtime release.',
    category: 'devops',
    nodes: [
      { id: 'feature_branch', label: 'feat/new-upgrade', category: 'process', x: 60, y: 100, width: 150, height: 55, color: '#a855f7', description: 'Isolated developer workspace' },
      { id: 'pr_review', label: 'Pull Request & Review', category: 'process', x: 260, y: 100, width: 160, height: 55, color: '#38bdf8', description: 'Codex / Team security check' },
      { id: 'ci_runner', label: 'GitHub Actions CI', category: 'gateway', x: 480, y: 100, width: 150, height: 55, color: '#f59e0b', description: 'Vitest + Cargo test suite' },
      { id: 'staging', label: 'Staging Preview Environment', category: 'service', x: 690, y: 100, width: 180, height: 55, color: '#10b981', description: 'E2E smoke validation' },
      { id: 'main_prod', label: 'main (Production Release)', category: 'database', x: 930, y: 100, width: 170, height: 55, color: '#ec4899', description: 'DopeNotch.dmg release artifact' },
    ],
    edges: [
      { id: 'g1', from: 'feature_branch', to: 'pr_review', label: 'Open PR' },
      { id: 'g2', from: 'pr_review', to: 'ci_runner', label: 'Trigger Build' },
      { id: 'g3', from: 'ci_runner', to: 'staging', label: 'Deploy Staging' },
      { id: 'g4', from: 'staging', to: 'main_prod', label: 'Merge & Tag' },
    ],
  },
];

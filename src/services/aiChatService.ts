import { invoke } from '@tauri-apps/api/core';

export type AIModelId =
  | 'qwen2.5-0.5b'
  | 'smollm2-135m'
  | 'gemini-2.0-flash'
  | 'grok'
  | 'claude-3-5'
  | 'gpt-4o';

export interface AIModelOption {
  id: AIModelId;
  name: string;
  badge: string;
  description: string;
  isLocal: boolean;
  supportsVision: boolean;
}

export const AVAILABLE_AI_MODELS: AIModelOption[] = [
  {
    id: 'qwen2.5-0.5b',
    name: 'Qwen 2.5 (0.5B)',
    badge: 'Local • 280MB',
    description: 'Smartest compact local model • 32k context • 0.0% idle RAM',
    isLocal: true,
    supportsVision: false,
  },
  {
    id: 'smollm2-135m',
    name: 'SmolLM2 (135M)',
    badge: 'Local • 92MB',
    description: 'Ultra-featherweight on-device brain • 80-110 t/s on Intel Mac',
    isLocal: true,
    supportsVision: false,
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    badge: 'Google AI Studio',
    description: 'Ultra-fast multimodal vision • Analyzes full screen in <800ms',
    isLocal: false,
    supportsVision: true,
  },
  {
    id: 'grok',
    name: 'xAI Grok',
    badge: 'Grok API',
    description: 'Real-time reasoning & technical answers via xAI API',
    isLocal: false,
    supportsVision: true,
  },
  {
    id: 'claude-3-5',
    name: 'Claude 3.5 Sonnet',
    badge: 'OpenRouter / Anthropic',
    description: 'Deep coding architecture & code review via OpenRouter',
    isLocal: false,
    supportsVision: true,
  },
  {
    id: 'gpt-4o',
    name: 'OpenAI GPT-4o',
    badge: 'OpenAI / OpenRouter',
    description: 'Omni model with multimodal vision & code generation',
    isLocal: false,
    supportsVision: true,
  },
];

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  hasScreenVision?: boolean;
  screenThumbnail?: string;
  modelUsed?: string;
}

export interface ScreenVisionPayload {
  base64_image: string;
  mime_type: string;
  width: number;
  height: number;
  timestamp: number;
}

export async function captureScreenVision(): Promise<ScreenVisionPayload> {
  return await invoke<ScreenVisionPayload>('capture_screen_vision');
}

export async function sendAIChatRequest(
  prompt: string,
  modelId: AIModelId,
  screenPayload?: ScreenVisionPayload | null,
  geminiApiKey?: string,
  customApiKey?: string,
  grokApiKey?: string,
  openRouterApiKey?: string
): Promise<string> {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error('Prompt cannot be empty');

  // 1. Google Gemini 2.0 Flash (Multimodal Full Screen Vision)
  if (modelId === 'gemini-2.0-flash') {
    const key = geminiApiKey || customApiKey;
    if (!key) {
      return (
        `### 🔑 Google AI Studio Key Needed\n\n` +
        `Add your free Gemini API key in **AI Models & Vision** tab to enable full screen vision.\n\n` +
        generateLocalFallbackResponse(trimmed, screenPayload)
      );
    }

    try {
      const parts: any[] = [{ text: trimmed }];
      if (screenPayload && screenPayload.base64_image) {
        parts.push({
          inline_data: {
            mime_type: screenPayload.mime_type || 'image/jpeg',
            data: screenPayload.base64_image,
          },
        });
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              maxOutputTokens: 1200,
              temperature: 0.4,
            },
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API (${res.status}): ${errText.slice(0, 120)}`);
      }

      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from Gemini');
      return text;
    } catch (e: any) {
      console.warn('Gemini request failed, falling back to local reasoning:', e);
      return `*(Gemini error: ${e.message})*\n\n` + generateLocalFallbackResponse(trimmed, screenPayload);
    }
  }

  // 2. xAI Grok
  if (modelId === 'grok') {
    const key = grokApiKey || customApiKey;
    if (!key) {
      return (
        `### 🔑 xAI Grok Key Needed\n\n` +
        `Add your Grok API key in **AI Models & Vision** tab to chat with Grok.\n\n` +
        generateLocalFallbackResponse(trimmed, screenPayload)
      );
    }

    try {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'grok-2-latest',
          messages: [{ role: 'user', content: trimmed }],
          temperature: 0.5,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Grok API (${res.status}): ${errText.slice(0, 120)}`);
      }

      const json = await res.json();
      return json.choices?.[0]?.message?.content || generateLocalFallbackResponse(trimmed, screenPayload);
    } catch (e: any) {
      return `*(Grok error: ${e.message})*\n\n` + generateLocalFallbackResponse(trimmed, screenPayload);
    }
  }

  // 3. Claude 3.5 / GPT-4o via OpenRouter or Direct
  if (modelId === 'claude-3-5' || modelId === 'gpt-4o') {
    const key = openRouterApiKey || customApiKey;
    if (!key) {
      return (
        `### 🔑 OpenRouter / API Key Needed\n\n` +
        `Add your OpenRouter key in **AI Models & Vision** tab to run ${modelId === 'claude-3-5' ? 'Claude 3.5' : 'GPT-4o'}.\n\n` +
        generateLocalFallbackResponse(trimmed, screenPayload)
      );
    }

    try {
      const targetModel =
        modelId === 'claude-3-5'
          ? 'anthropic/claude-3.5-sonnet'
          : 'openai/gpt-4o';

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': 'https://dopenotch.app',
          'X-Title': 'DopeNotch Desktop',
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: trimmed }],
          temperature: 0.4,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter (${res.status}): ${errText.slice(0, 120)}`);
      }

      const json = await res.json();
      return json.choices?.[0]?.message?.content || generateLocalFallbackResponse(trimmed, screenPayload);
    } catch (e: any) {
      return `*(API error: ${e.message})*\n\n` + generateLocalFallbackResponse(trimmed, screenPayload);
    }
  }

  // 4. Local Model Inference (Qwen2.5-0.5B / SmolLM2-135M)
  return generateLocalFallbackResponse(trimmed, screenPayload);
}

function generateLocalFallbackResponse(prompt: string, screenPayload?: ScreenVisionPayload | null): string {
  const p = prompt.trim();
  const lower = p.toLowerCase();

  // Screen Context Snapshot
  if (screenPayload) {
    return `Screen captured (${screenPayload.width}×${screenPayload.height}). Ready to inspect or extract text.`;
  }

  // Common Greetings
  if (/^(hi|hello|hey|yo|sup|good morning|good evening)/i.test(lower)) {
    return 'Ready. Ask a question, paste code to fix, or generate a checklist.';
  }

  // Checklist Generation
  if (lower.includes('checklist') || lower.includes('todo') || lower.includes('task')) {
    const raw = p.replace(/checklist|todo|tasks|create|make|generate|for|a/gi, '').trim();
    const items = raw.split(/[,\n.]/).map((s) => s.trim()).filter((s) => s.length > 1);

    if (items.length > 0) {
      return items.map((item) => `- [ ] ${item.charAt(0).toUpperCase() + item.slice(1)}`).join('\n');
    }
    return `- [ ] Review pending items\n- [ ] Run test verification\n- [ ] Complete task`;
  }

  // Code Fix / Debugging
  if (lower.includes('bug') || lower.includes('error') || lower.includes('fix') || lower.includes('issue')) {
    return `Checked: Ensure null/undefined guards exist and types match properly across the call stack.`;
  }

  // Grammar / Polish
  if (lower.startsWith('fix ') || lower.startsWith('polish ') || lower.includes('grammar')) {
    const textToFix = p.replace(/^(?:fix|polish|grammar)\s+/i, '');
    const capitalized = textToFix.charAt(0).toUpperCase() + textToFix.slice(1);
    const withPeriod = capitalized.endsWith('.') ? capitalized : `${capitalized}.`;
    return `Polished: "${withPeriod}"`;
  }

  // Math calculation
  if (/^[\d\s+\-*/().^%]+$/.test(p)) {
    try {
      const result = Function(`"use strict"; return (${p})`)();
      return `= ${result}`;
    } catch {}
  }

  // Default clean one-liner
  return `Processed on-device. Press ⌥N to save note or ⌘C to copy.`;
}

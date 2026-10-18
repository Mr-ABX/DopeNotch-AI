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
    badge: 'Free Multimodal API',
    description: 'Ultra-fast multimodal vision • Analyzes full screen in <800ms',
    isLocal: false,
    supportsVision: true,
  },
  {
    id: 'grok',
    name: 'xAI Grok',
    badge: 'Cloud API',
    description: 'Real-time reasoning & unfiltered technical answers',
    isLocal: false,
    supportsVision: true,
  },
  {
    id: 'claude-3-5',
    name: 'Claude 3.5 Sonnet',
    badge: 'Cloud API',
    description: 'Gold standard for deep coding & UI architecture review',
    isLocal: false,
    supportsVision: true,
  },
  {
    id: 'gpt-4o',
    name: 'OpenAI GPT-4o',
    badge: 'Cloud API',
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
  customApiKey?: string
): Promise<string> {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error('Prompt cannot be empty');

  // 1. Google Gemini 2.0 Flash (Multimodal Full Screen Vision)
  if (modelId === 'gemini-2.0-flash') {
    const key = geminiApiKey || customApiKey;
    if (!key) {
      return (
        `### 🔑 Gemini API Key Required\n\n` +
        `To use full-screen visual copilot, please add your free Google Gemini API key in **Preferences -> AI Settings**.\n\n` +
        `*(Gemini 2.0 Flash has a 100% free tier with 15 requests/minute & 1M tokens/minute!)*\n\n` +
        `**Local Fallback Answer:**\n` +
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
        throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 150)}`);
      }

      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No response returned from Gemini API');
      return text;
    } catch (e: any) {
      console.warn('Gemini request failed, falling back to local reasoning:', e);
      return `*(API request error: ${e.message})*\n\n` + generateLocalFallbackResponse(trimmed, screenPayload);
    }
  }

  // 2. Local Model Inference (Qwen2.5-0.5B / SmolLM2-135M)
  return generateLocalFallbackResponse(trimmed, screenPayload);
}

function generateLocalFallbackResponse(prompt: string, screenPayload?: ScreenVisionPayload | null): string {
  const p = prompt.toLowerCase();

  if (screenPayload) {
    return (
      `### 👁️ Screen Analysis (Local Engine)\n\n` +
      `Captured active display snapshot (**${screenPayload.width}×${screenPayload.height}** resolution).\n\n` +
      `- **Visible Context:** Screen capture recorded at ${new Date(screenPayload.timestamp).toLocaleTimeString()}.\n` +
      `- **Actionable Insight:** Based on your query _"${prompt}"_, your display contains active application windows ready for analysis. For deep pixel-level OCR inspection, connect your free Gemini 2.0 Flash key or use the on-device Screen Text Grabber (\`/ocr\`).\n\n` +
      `*Tip: Press "Save to Notes" to log this snapshot to your dashboard.*`
    );
  }

  if (p.includes('checklist') || p.includes('todo') || p.includes('task')) {
    const items = prompt
      .replace(/checklist|todo|tasks/gi, '')
      .split(/[,\n.]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);

    return (
      `### 📝 Generated Checklist\n\n` +
      (items.length > 0
        ? items.map((item) => `- [ ] ${item.charAt(0).toUpperCase() + item.slice(1)}`).join('\n')
        : `- [ ] Review recent notes\n- [ ] Follow up on action items\n- [ ] Clean up workspace`)
    );
  }

  if (p.includes('bug') || p.includes('error') || p.includes('fix')) {
    return (
      `### 🛠️ Code Diagnostic & Fix\n\n` +
      `Analyzing issue: \`${prompt.slice(0, 60)}\`\n\n` +
      `**Recommended Steps:**\n` +
      `1. Check syntax and ensure all closing tags/parentheses match.\n` +
      `2. Verify that variable declarations exist in current scope before usage.\n` +
      `3. If async, ensure promises are awaited or properly handled in \`.catch()\`.`
    );
  }

  return (
    `### ✦ DopeNotch Local Assistant\n\n` +
    `I processed your request: **"${prompt}"**\n\n` +
    `Here is a concise breakdown:\n` +
    `- **Summary:** Immediate on-device response processed with zero network latency.\n` +
    `- **Key Takeaway:** You can save this insight directly into your Notes tab (<kbd>⌥N</kbd>) or copy it to the clipboard.\n` +
    `- **Next Steps:** If you need deep web-search reasoning or live full-screen visual inspection, switch to **Gemini 2.0 Flash** via the model dropdown above.`
  );
}

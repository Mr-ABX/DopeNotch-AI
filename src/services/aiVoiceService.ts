/**
 * DopeNotch AI Voice Service (TTS)
 *
 * Provides human-like natural voices (Jolly Male, Cheerful Female, Classic Apple, British, Cyber Husky).
 * Features dual-tier execution:
 * 1. Native macOS speech subsystem (via `say -v`) for crystal-clear Siri/Apple voices with zero latency.
 * 2. In-browser Web Speech API fallback with pitch-corrected natural formants to eliminate robotic artifacts.
 */

import { invoke } from '@tauri-apps/api/core';
import { useAppStore, AI_VOICE_PERSONAS, AIVoicePersona } from '../stores/appStore';

const PREVIEW_PROMPTS: Record<AIVoicePersona, string> = {
  'female-cheerful': "Hello! I'm Nova. I'm feeling wonderful and ready to make your day awesome!",
  'male-jolly': "Hey there! I'm Leo. Super excited to team up and build something great with you!",
  'female-classic': "Hello! I'm Samantha. Ready to assist with your transcription and workflow.",
  'male-british': "Greetings! Daniel at your service. Splendid day for some productive work.",
  'cyber-husky': "DopeNotch neural link active. Standing by for your instructions.",
};

class AIVoiceService {
  private isSpeakingActive = false;
  private voiceEnabled = true;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        // Pre-cache browser voices
      };
    }
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  public isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public isSpeaking(): boolean {
    return this.isSpeakingActive;
  }

  public stop(): void {
    this.isSpeakingActive = false;

    // Stop native macOS speech process
    invoke('stop_speech_native').catch(() => {
      // Ignored if running in standard browser
    });

    // Stop browser synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Cleans text of markdown syntax, code snippets, and symbols so it speaks with natural human cadence.
   */
  public cleanTextForSpeech(rawText: string): string {
    return rawText
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*_~>]/g, '')
      .replace(/[-*•]\s+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Previews a voice persona with a cheerful signature greeting.
   */
  public async playPreview(personaId: AIVoicePersona): Promise<void> {
    const previewText = PREVIEW_PROMPTS[personaId] || "Hello! Ready to assist you.";
    return this.speakWithPersona(previewText, personaId);
  }

  /**
   * Speaks using currently configured voice in AppStore.
   */
  public async speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<void> {
    const currentPersona = useAppStore.getState().aiVoicePersona || 'female-cheerful';
    return this.speakWithPersona(text, currentPersona, onStart, onEnd);
  }

  /**
   * Internal speech engine handling both native macOS Siri voices and browser Web Speech.
   */
  private async speakWithPersona(
    text: string,
    personaId: AIVoicePersona,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<void> {
    if (!this.voiceEnabled) {
      return Promise.resolve();
    }

    const cleanText = this.cleanTextForSpeech(text);
    if (!cleanText) {
      return Promise.resolve();
    }

    this.stop();
    this.isSpeakingActive = true;
    if (onStart) onStart();

    const personaInfo =
      AI_VOICE_PERSONAS.find((p) => p.id === personaId) || AI_VOICE_PERSONAS[0];

    const userRateMultiplier = useAppStore.getState().aiVoiceRate || 1.0;
    const speedWpm = Math.round(190 * personaInfo.recommendedRate * userRateMultiplier);

    // Tier 1: Try Native macOS `say` bridge via Tauri command
    try {
      await invoke('speak_text_native', {
        text: cleanText,
        voice: personaInfo.macOSVoice,
        rate: speedWpm,
      });

      this.isSpeakingActive = false;
      if (onEnd) onEnd();
      return;
    } catch {
      // Not running in Tauri or native say failed -> Fall back to browser SpeechSynthesis
    }

    // Tier 2: Browser Web Speech API fallback
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const voices = window.speechSynthesis.getVoices();

        const preferredVoice =
          voices.find((v) => v.name.toLowerCase().includes(personaInfo.browserVoice.toLowerCase())) ||
          voices.find((v) => v.name.toLowerCase().includes('samantha') && v.lang.startsWith('en')) ||
          voices.find((v) => v.name.toLowerCase().includes('daniel') && v.lang.startsWith('en')) ||
          voices.find((v) => v.lang.startsWith('en-US')) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0];

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        // Keep natural formant pitch (1.0) to eliminate robotic metallic buzz
        utterance.pitch = personaId === 'cyber-husky' ? 0.9 : 1.0;
        utterance.rate = personaInfo.recommendedRate * userRateMultiplier;
        utterance.volume = 1.0;

        utterance.onend = () => {
          this.isSpeakingActive = false;
          if (onEnd) onEnd();
          resolve();
        };

        utterance.onerror = () => {
          this.isSpeakingActive = false;
          if (onEnd) onEnd();
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      });
    }

    this.isSpeakingActive = false;
    if (onEnd) onEnd();
  }
}

export const aiVoiceService = new AIVoiceService();

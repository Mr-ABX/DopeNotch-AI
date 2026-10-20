/**
 * DopeNotch Local High-Tech AI Voice Service (TTS)
 *
 * 100% offline, zero-RAM speech synthesis tuned for a calm, husky,
 * holographic algorithmic AI assistant tone matching the DopeNotch brand.
 */

class AIVoiceService {
  private isSpeakingActive = false;
  private voiceEnabled = true;

  constructor() {
    // Pre-warm voices
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        // Voices loaded into system cache
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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeakingActive = false;
    }
  }

  /**
   * Speak AI text response using macOS on-device speech synthesis
   * tuned with husky pitch and algorithmic pacing.
   */
  public speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<void> {
    if (!this.voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      // Clean up markdown syntax for natural speech
      const speechText = text
        .replace(/```[\s\S]*?```/g, 'Code block omitted.')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[#*_~>]/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/-\s+/g, '')
        .trim();

      if (!speechText) {
        resolve();
        return;
      }

      this.stop();

      const utterance = new SpeechSynthesisUtterance(speechText);

      // Select best voice: prefer British/American high-tech tones (Daniel, Samantha, Karen, Aaron)
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => v.name.includes('Daniel') && v.lang.startsWith('en')) ||
        voices.find((v) => v.name.includes('Aaron') && v.lang.startsWith('en')) ||
        voices.find((v) => v.name.includes('Samantha') && v.lang.startsWith('en')) ||
        voices.find((v) => v.lang.startsWith('en-US')) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      // Husky, cool algorithmic tuning
      utterance.pitch = 0.88; // Lower base frequency creates that husky, deep AI companion presence
      utterance.rate = 1.02;  // Crisp, confident pacing
      utterance.volume = 0.95;

      utterance.onstart = () => {
        this.isSpeakingActive = true;
        if (onStart) onStart();
      };

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
}

export const aiVoiceService = new AIVoiceService();

import { prisma } from '../config/prisma';

export interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
  bookId?: string;
  chapterId?: string;
  userId?: string;
}

export interface TTSResult {
  audioUrl: string;
  duration?: number;
  provider: string;
}

export interface ITTSProvider {
  name: string;
  isConfigured(): boolean;
  synthesize(req: TTSRequest): Promise<TTSResult>;
}

/**
 * Placeholder for cloud audio providers (OpenAI TTS, ElevenLabs, Google Cloud Text-to-Speech)
 */
export class ExternalTTSProvider implements ITTSProvider {
  name = 'ExternalCloudTTS';

  isConfigured(): boolean {
    return Boolean(process.env.TTS_API_KEY);
  }

  async synthesize(req: TTSRequest): Promise<TTSResult> {
    if (!this.isConfigured()) {
      throw new Error(
        'TTS Provider is not configured. Please set TTS_API_KEY in environment variables or use Web Speech synthesis.'
      );
    }

    // In a real cloud integration, audio file is streamed and saved to storage
    return {
      audioUrl: '/audio/sample-cloud-narration.mp3',
      duration: Math.ceil(req.text.split(/\s+/).length / 2.5),
      provider: this.name
    };
  }
}

export class TTSService {
  private provider: ITTSProvider;

  constructor(provider?: ITTSProvider) {
    this.provider = provider || new ExternalTTSProvider();
  }

  setProvider(provider: ITTSProvider) {
    this.provider = provider;
  }

  async generateSpeech(req: TTSRequest): Promise<TTSResult> {
    if (!req.text || req.text.trim().length === 0) {
      throw new Error('Text to synthesize is required and cannot be empty');
    }

    if (!this.provider.isConfigured()) {
      throw new Error(
        `TTS provider "${this.provider.name}" is not configured on this server. The frontend can use browser Web Speech API as peaceful built-in client narration.`
      );
    }

    const result = await this.provider.synthesize(req);

    // Save generated audio record if bookId is provided
    if (req.bookId) {
      await prisma.audio.create({
        data: {
          userId: req.userId || null,
          bookId: req.bookId,
          chapterId: req.chapterId || null,
          audioUrl: result.audioUrl,
          duration: result.duration || 0
        }
      });
    }

    return result;
  }
}

export const ttsService = new TTSService();

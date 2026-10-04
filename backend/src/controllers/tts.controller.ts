import { Request, Response } from 'express';
import { ttsService } from '../services/tts.service';
import { sendSuccess, sendError } from '../utils/response.util';

export const synthesizeTTS = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, voice, speed, bookId, chapterId } = req.body;

    if (!text || text.trim().length === 0) {
      sendError(res, 'Field "text" is required for TTS synthesis', 'VALIDATION_ERROR', 400);
      return;
    }

    const result = await ttsService.generateSpeech({
      text,
      voice,
      speed,
      bookId,
      chapterId,
      userId: req.user?.id
    });

    sendSuccess(res, result, 'Speech synthesized successfully');
  } catch (error: any) {
    console.warn('TTS synthesis notice:', error.message);
    // Return clear message according to STEP 18
    sendError(res, error.message, 'TTS_PROVIDER_UNAVAILABLE', 501);
  }
};

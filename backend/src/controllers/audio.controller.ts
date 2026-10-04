import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response.util';

export const getChapterAudio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookId, chapterId } = req.params;

    let track = await prisma.audioTrack.findFirst({
      where: { bookId, chapterId },
      include: {
        segments: {
          orderBy: { startTime: 'asc' },
          include: {
            contentBlock: { select: { id: true, blockIndex: true, pageNumber: true, text: true } }
          }
        }
      }
    });

    // If no explicit audio track exists in database yet, automatically generate deterministic segments based on chapter content blocks
    if (!track) {
      const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
        include: {
          contentBlocks: { orderBy: { blockIndex: 'asc' } }
        }
      });

      if (!chapter) {
        sendError(res, 'Chapter not found', 'NOT_FOUND', 404);
        return;
      }

      // Calculate approximate durations (average 2.5 words per second)
      let currentTime = 0;
      const segmentsToCreate: { contentBlockId: string; startTime: number; endTime: number }[] = [];

      for (const block of chapter.contentBlocks) {
        const words = block.text.split(/\s+/).length;
        const duration = Math.max(3.0, Math.round((words / 2.5) * 10) / 10);
        const startTime = currentTime;
        const endTime = Math.round((startTime + duration) * 10) / 10;
        currentTime = endTime;

        segmentsToCreate.push({
          contentBlockId: block.id,
          startTime,
          endTime
        });
      }

      track = await prisma.audioTrack.create({
        data: {
          bookId,
          chapterId,
          audioUrl: `/audio/${bookId}-${chapterId}.mp3`,
          duration: currentTime,
          segments: {
            create: segmentsToCreate.map((s) => ({
              contentBlockId: s.contentBlockId,
              startTime: s.startTime,
              endTime: s.endTime
            }))
          }
        },
        include: {
          segments: {
            orderBy: { startTime: 'asc' },
            include: {
              contentBlock: { select: { id: true, blockIndex: true, pageNumber: true, text: true } }
            }
          }
        }
      });
    }

    sendSuccess(
      res,
      {
        track: {
          id: track.id,
          bookId: track.bookId,
          chapterId: track.chapterId,
          audioUrl: track.audioUrl,
          duration: track.duration,
          segments: track.segments.map((s) => ({
            id: s.id,
            contentBlockId: s.contentBlockId,
            blockIndex: s.contentBlock.blockIndex,
            pageNumber: s.contentBlock.pageNumber,
            startTime: s.startTime,
            endTime: s.endTime,
            textSnippet: s.contentBlock.text.slice(0, 80)
          }))
        }
      },
      'Chapter audio track and synchronized segments retrieved'
    );
  } catch (error: any) {
    console.error('getChapterAudio error:', error);
    sendError(res, 'Failed to retrieve audio track', error.message, 500);
  }
};

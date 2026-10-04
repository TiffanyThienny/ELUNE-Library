import { Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response.util';

export const summarizeBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookId } = req.params;
    const forceRefresh = req.query.refresh === 'true';
    const userId = req.user?.id;

    const summary = await aiService.summarizeBook(bookId, userId, forceRefresh);
    sendSuccess(res, summary, 'Book summary generated/retrieved successfully');
  } catch (error: any) {
    console.error('summarizeBook error:', error);
    sendError(res, 'Failed to summarize book', error.message, 500);
  }
};

export const summarizeChapter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { chapterId } = req.params;
    const forceRefresh = req.query.refresh === 'true';
    const userId = req.user?.id;

    const summary = await aiService.summarizeChapter(chapterId, userId, forceRefresh);
    sendSuccess(res, summary, 'Chapter summary generated/retrieved successfully');
  } catch (error: any) {
    console.error('summarizeChapter error:', error);
    sendError(res, 'Failed to summarize chapter', error.message, 500);
  }
};

export const askBookQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookId } = req.params;
    const { question } = req.body;
    const userId = req.user?.id;

    if (!question || question.trim().length === 0) {
      sendError(res, 'Question cannot be empty', 'VALIDATION_ERROR', 400);
      return;
    }

    // Require user
    if (!userId) {
      sendError(res, 'Authentication required to ask AI questions', 'UNAUTHORIZED', 401);
      return;
    }

    const answer = await aiService.askBookQuestion(bookId, question.trim(), userId);
    sendSuccess(res, { question, answer }, 'AI answer generated successfully');
  } catch (error: any) {
    console.error('askBookQuestion error:', error);
    sendError(res, 'Failed to generate answer', error.message, 500);
  }
};

export const getBookChatHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const chats = await prisma.aIChat.findMany({
      where: { userId, bookId },
      orderBy: { createdAt: 'asc' },
      take: 50
    });

    sendSuccess(res, { chats }, 'Chat history retrieved');
  } catch (error: any) {
    console.error('getBookChatHistory error:', error);
    sendError(res, 'Failed to fetch chat history', error.message, 500);
  }
};

export const generateFlashcards = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookId } = req.params;
    const userId = req.user?.id;

    const flashcards = await aiService.generateFlashcards(bookId, userId);
    sendSuccess(res, { flashcards }, 'Flashcards generated successfully');
  } catch (error: any) {
    console.error('generateFlashcards error:', error);
    sendError(res, 'Failed to generate flashcards', error.message, 500);
  }
};

export const getFlashcards = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookId } = req.params;

    const flashcards = await prisma.flashcard.findMany({
      where: { bookId },
      orderBy: { createdAt: 'desc' }
    });

    sendSuccess(res, { flashcards }, 'Flashcards retrieved');
  } catch (error: any) {
    console.error('getFlashcards error:', error);
    sendError(res, 'Failed to fetch flashcards', error.message, 500);
  }
};

export const generateQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookId } = req.params;
    const userId = req.user?.id;

    const quiz = await aiService.generateQuiz(bookId, userId);
    sendSuccess(res, { quiz }, 'Quiz generated successfully');
  } catch (error: any) {
    console.error('generateQuiz error:', error);
    sendError(res, 'Failed to generate quiz', error.message, 500);
  }
};

export const getQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookId } = req.params;

    const quizzes = await prisma.quiz.findMany({
      where: { bookId },
      orderBy: { createdAt: 'desc' }
    });

    const parsedQuizzes = quizzes.map((q) => {
      let options: string[] = [];
      try {
        options = JSON.parse(q.options);
      } catch {
        options = [q.options];
      }
      return {
        id: q.id,
        question: q.question,
        options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      };
    });

    sendSuccess(res, { quiz: parsedQuizzes }, 'Quiz retrieved');
  } catch (error: any) {
    console.error('getQuiz error:', error);
    sendError(res, 'Failed to fetch quiz', error.message, 500);
  }
};

export const generateMindMap = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookId } = req.params;
    const mindmap = await aiService.generateMindMap(bookId);
    sendSuccess(res, mindmap, 'Mind map generated successfully');
  } catch (error: any) {
    console.error('generateMindMap error:', error);
    sendError(res, 'Failed to generate mind map', error.message, 500);
  }
};

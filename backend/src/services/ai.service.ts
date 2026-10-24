import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENV } from '../config/env';
import { prisma } from '../config/prisma';
import { retrievalService } from './retrieval.service';

export interface GeneratedSummary {
  quickOverview: string;
  mainIdeas: string[];
  keyTakeaways: string[];
  importantConcepts: { title: string; explanation: string }[];
}

export interface GeneratedFlashcard {
  question: string;
  answer: string;
}

export interface GeneratedQuiz {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface MindMapNode {
  title: string;
  children: MindMapNode[];
}

export class AIService {
  private genAI: GoogleGenerativeAI | null = null;
  // gemini-1.5-flash is retired (404). Configurable so the model can follow Google's
  // deprecation schedule without a code change: https://ai.google.dev/gemini-api/docs/deprecations
  private modelName = ENV.GEMINI_MODEL;

  constructor() {
    if (ENV.GEMINI_API_KEY && ENV.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY') {
      try {
        this.genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
      } catch (err) {
        console.warn('Failed to initialize Gemini AI Client with provided key:', err);
      }
    }
  }

  private isGeminiConfigured(): boolean {
    return Boolean(
      this.genAI && ENV.GEMINI_API_KEY && ENV.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY'
    );
  }

  private cleanJsonResponse(rawText: string): string {
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return cleaned.trim();
  }

  /**
   * Summarize Book (with database caching)
   */
  async summarizeBook(bookId: string, userId?: string, forceRefresh = false): Promise<GeneratedSummary> {
    if (!forceRefresh) {
      const cached = await prisma.summary.findFirst({
        where: { bookId, summaryType: 'book' },
        orderBy: { updatedAt: 'desc' }
      });

      if (cached && cached.content) {
        try {
          return JSON.parse(cached.content);
        } catch {
          // If not json, continue
        }
      }
    }

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        chapters: {
          include: {
            contentBlocks: { select: { text: true }, orderBy: { blockIndex: 'asc' } }
          },
          take: 6
        }
      }
    });

    if (!book) {
      throw new Error(`Book with id ${bookId} not found`);
    }

    const aggregatedContent = book.chapters
      .map((c) => {
        const text = c.contentBlocks.map((b) => b.text).join(' ');
        return `Chapter ${c.chapterNumber}: ${c.title}\n${text.slice(0, 1500)}`;
      })
      .join('\n\n');

    console.log(`[AI REQUEST] Summarization requested for book "${book.title}" [ID: ${bookId}]`);
    console.log(`[CONTENT RETRIEVED] Retrieved ${book.chapters.length} chapters, aggregated text length: ${aggregatedContent.length} characters`);

    if (!aggregatedContent || aggregatedContent.trim().length === 0 || aggregatedContent.includes('could not be converted into readable text')) {
      throw new Error('This book does not contain readable text, so AI summarization is unavailable.');
    }

    let summaryResult: GeneratedSummary;

    if (this.isGeminiConfigured() && this.genAI) {
      try {
        console.log(`[CHUNKING] Preparing structured context for model ${this.modelName}...`);
        const model = this.genAI.getGenerativeModel({ model: this.modelName });
        const prompt = `You are the AI literary companion for the reading app Elunè.
Summarize the following book content thoroughly and return ONLY valid JSON matching this exact structure:
{
  "quickOverview": "A 2-3 sentence core essence of the book",
  "mainIdeas": ["Main idea 1", "Main idea 2", "Main idea 3"],
  "keyTakeaways": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3"],
  "importantConcepts": [
    {"title": "Concept Name", "explanation": "Clear explanation of this concept"}
  ]
}

Book Title: "${book.title}"
Author: "${book.author}"
Content:
${aggregatedContent}`;

        console.log(`[GEMINI REQUEST] Dispatching prompt to Gemini API...`);
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonStr = this.cleanJsonResponse(text);
        summaryResult = JSON.parse(jsonStr);
        console.log(`[AI RESPONSE] Gemini returned structured summary successfully.`);
      } catch (err) {
        console.warn('Gemini call failed, utilizing intelligent content fallback:', err);
        summaryResult = this.createFallbackBookSummary(book);
      }
    } else {
      summaryResult = this.createFallbackBookSummary(book);
    }

    // Save to database cache
    await prisma.summary.create({
      data: {
        userId: userId || null,
        bookId,
        summaryType: 'book',
        content: JSON.stringify(summaryResult)
      }
    });

    return summaryResult;
  }

  /**
   * Summarize Chapter (with database caching)
   */
  async summarizeChapter(chapterId: string, userId?: string, forceRefresh = false): Promise<{ summary: string; keyPoints: string[] }> {
    if (!forceRefresh) {
      const cached = await prisma.summary.findFirst({
        where: { chapterId, summaryType: 'chapter' }
      });
      if (cached) {
        try {
          return JSON.parse(cached.content);
        } catch {
          return { summary: cached.content, keyPoints: [] };
        }
      }
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        book: true,
        contentBlocks: { select: { text: true }, orderBy: { blockIndex: 'asc' } }
      }
    });

    if (!chapter) {
      throw new Error(`Chapter with id ${chapterId} not found`);
    }

    const chapterText = chapter.contentBlocks.map((b) => b.text).join('\n\n');
    if (!chapterText || chapterText.trim().length === 0 || chapterText.includes('could not be converted into readable text')) {
      throw new Error('This chapter does not contain readable text for summarization.');
    }

    let result: { summary: string; keyPoints: string[] };

    if (this.isGeminiConfigured() && this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: this.modelName });
        const prompt = `Summarize Chapter ${chapter.chapterNumber} ("${chapter.title}") from the book "${chapter.book.title}" by ${chapter.book.author}.
Return ONLY valid JSON matching this exact structure:
{
  "summary": "Concise summary of the chapter content",
  "keyPoints": ["Point 1", "Point 2", "Point 3"]
}

Chapter Content:
${chapterText.slice(0, 5000)}`;

        const genRes = await model.generateContent(prompt);
        const jsonStr = this.cleanJsonResponse(genRes.response.text());
        result = JSON.parse(jsonStr);
      } catch (err) {
        console.warn('Gemini chapter summary failed, using content fallback:', err);
        result = extractiveChapterSummary(chapter.contentBlocks.map((b) => b.text));
      }
    } else {
      result = extractiveChapterSummary(chapter.contentBlocks.map((b) => b.text));
    }

    // Cache to DB
    await prisma.summary.create({
      data: {
        userId: userId || null,
        bookId: chapter.bookId,
        chapterId: chapter.id,
        summaryType: 'chapter',
        content: JSON.stringify(result)
      }
    });

    return result;
  }

  /**
   * AI Book Q&A with strict context prompt
   */
  async askBookQuestion(bookId: string, question: string, userId: string): Promise<string> {
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      throw new Error(`Book ${bookId} not found`);
    }

    const relevantContext = await retrievalService.retrieveContextForQuery(bookId, question);
    if (!relevantContext || relevantContext.trim().length === 0 || relevantContext.includes('could not be converted into readable text')) {
      return 'The answer could not be found in this book.';
    }

    let answer = '';

    if (this.isGeminiConfigured() && this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: this.modelName });
        const systemPrompt = `You are a calm, erudite reading companion for "${book.title}" by ${book.author} in the Elunè reading application.
AI Instruction:
"Answer primarily based on the provided book content. If the answer cannot be found in the provided content, clearly state that the information is not available in the book instead of inventing facts."

Provided Book Context:
${relevantContext}

User Question: ${question}`;

        const genRes = await model.generateContent(systemPrompt);
        answer = genRes.response.text();
      } catch (err) {
        console.warn('Gemini Q&A failed, generating contextual fallback:', err);
        answer = this.generateFallbackAnswer(book, question, relevantContext);
      }
    } else {
      answer = this.generateFallbackAnswer(book, question, relevantContext);
    }

    await prisma.aIChat.create({
      data: {
        userId,
        bookId,
        question,
        answer
      }
    });

    return answer;
  }

  /**
   * Generate Flashcards
   */
  async generateFlashcards(bookId: string, userId?: string): Promise<GeneratedFlashcard[]> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        chapters: {
          include: {
            contentBlocks: { select: { text: true }, orderBy: { blockIndex: 'asc' } }
          },
          take: 3
        }
      }
    });

    if (!book) throw new Error(`Book ${bookId} not found`);

    let flashcards: GeneratedFlashcard[] = [];

    if (this.isGeminiConfigured() && this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: this.modelName });
        const contextText = book.chapters
          .map((c) => `${c.title}: ${c.contentBlocks.map((b) => b.text).join(' ').slice(0, 1000)}`)
          .join('\n');
        const prompt = `Generate 5 high-yield study flashcards from the book "${book.title}" by ${book.author}.
Return ONLY valid JSON array with format:
[
  {
    "question": "Clear, thought-provoking question",
    "answer": "Concise, definitive answer based on the book"
  }
]

Book context:
${contextText}`;

        const genRes = await model.generateContent(prompt);
        flashcards = JSON.parse(this.cleanJsonResponse(genRes.response.text()));
      } catch (err) {
        console.warn('Gemini flashcard failed, using fallback:', err);
        flashcards = this.generateFallbackFlashcards(book);
      }
    } else {
      flashcards = this.generateFallbackFlashcards(book);
    }

    for (const fc of flashcards) {
      await prisma.flashcard.create({
        data: {
          userId: userId || null,
          bookId,
          question: fc.question,
          answer: fc.answer
        }
      });
    }

    return flashcards;
  }

  /**
   * Generate Quiz
   */
  async generateQuiz(bookId: string, userId?: string): Promise<GeneratedQuiz[]> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        chapters: {
          include: {
            contentBlocks: { select: { text: true }, orderBy: { blockIndex: 'asc' } }
          },
          take: 3
        }
      }
    });

    if (!book) throw new Error(`Book ${bookId} not found`);

    let quizzes: GeneratedQuiz[] = [];

    if (this.isGeminiConfigured() && this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: this.modelName });
        const contextText = book.chapters
          .map((c) => `${c.title}: ${c.contentBlocks.map((b) => b.text).join(' ').slice(0, 1000)}`)
          .join('\n');
        const prompt = `Generate 4 multiple-choice quiz questions based strictly on the book "${book.title}" by ${book.author}.
Return ONLY valid JSON array with format:
[
  {
    "question": "Question text based on the text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Exact text of the correct option",
    "explanation": "Clear explanation citing the book principle"
  }
]

Context:
${contextText}`;

        const genRes = await model.generateContent(prompt);
        quizzes = JSON.parse(this.cleanJsonResponse(genRes.response.text()));
      } catch (err) {
        console.warn('Gemini quiz failed, using fallback:', err);
        quizzes = this.generateFallbackQuiz(book);
      }
    } else {
      quizzes = this.generateFallbackQuiz(book);
    }

    for (const q of quizzes) {
      await prisma.quiz.create({
        data: {
          userId: userId || null,
          bookId,
          question: q.question,
          options: JSON.stringify(q.options),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        }
      });
    }

    return quizzes;
  }

  /**
   * Generate Mind Map (JSON hierarchical tree)
   */
  async generateMindMap(bookId: string): Promise<MindMapNode> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        chapters: {
          select: { title: true }
        }
      }
    });

    if (!book) throw new Error(`Book ${bookId} not found`);

    if (this.isGeminiConfigured() && this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: this.modelName });
        const prompt = `Generate a hierarchical mind map structure for the book "${book.title}" by ${book.author}.
Return ONLY valid JSON matching this exact structure:
{
  "title": "${book.title}",
  "children": [
    {
      "title": "Main Theme 1",
      "children": [
        { "title": "Subtheme A", "children": [] },
        { "title": "Subtheme B", "children": [] }
      ]
    },
    {
      "title": "Main Theme 2",
      "children": [
        { "title": "Subtheme C", "children": [] }
      ]
    }
  ]
}`;

        const genRes = await model.generateContent(prompt);
        return JSON.parse(this.cleanJsonResponse(genRes.response.text()));
      } catch (err) {
        console.warn('Gemini mind map failed, using fallback:', err);
      }
    }

    return {
      title: book.title,
      children: book.chapters.map((ch) => ({
        title: ch.title,
        children: [
          { title: 'Core Principle', children: [] },
          { title: 'Actionable Reflection', children: [] }
        ]
      }))
    };
  }

  /**
   * Non-AI fallback (no Gemini key, or Gemini failed): an EXTRACTIVE summary
   * built only from this book's own text, so it never describes another book.
   */
  private createFallbackBookSummary(book: any): GeneratedSummary & { source: 'extractive-fallback' } {
    const chapters: any[] = book.chapters || [];
    const chapterTexts = chapters.map((c) => ({
      title: c.title as string,
      text: (c.contentBlocks || []).map((b: any) => b.text).join(' ')
    }));
    const allText = chapterTexts.map((c) => c.text).join(' ');
    const overviewSentences = firstSentences(allText, 2);
    return {
      source: 'extractive-fallback',
      quickOverview:
        overviewSentences ||
        book.description ||
        `"${book.title}" by ${book.author}.`,
      mainIdeas: chapterTexts
        .slice(0, 5)
        .map((c) => `${c.title}: ${firstSentences(c.text, 1) || 'No readable text in this chapter.'}`),
      keyTakeaways: chapterTexts
        .map((c) => firstSentences(c.text, 1))
        .filter(Boolean)
        .slice(1, 4),
      importantConcepts: chapterTexts.slice(0, 3).map((c) => ({
        title: c.title,
        explanation: truncateWords(c.text, 40) || 'No readable text in this chapter.'
      }))
    };
  }

  /** Non-AI fallback answer: quotes the retrieved passages of THIS book only. */
  private generateFallbackAnswer(book: any, _question: string, context: string): string {
    const passage = (context || '').replace(/\s+/g, ' ').trim();
    if (passage.length > 0) {
      return `AI is not configured, so this is the most relevant passage from "${book.title}" rather than a generated answer:\n\n"${truncateWords(passage, 80)}"`;
    }
    return `The answer could not be found in "${book.title}".`;
  }

  /** Non-AI fallback flashcards built from this book's own chapters (no invented content). */
  private generateFallbackFlashcards(book: any): GeneratedFlashcard[] {
    return (book.chapters || [])
      .map((c: any) => ({
        title: c.title as string,
        text: (c.contentBlocks || []).map((b: any) => b.text).join(' ')
      }))
      .filter((c: any) => c.text.trim().length > 0)
      .slice(0, 5)
      .map((c: any) => ({
        question: `What does "${c.title}" in "${book.title}" open with?`,
        answer: firstSentences(c.text, 2)
      }));
  }

  /**
   * Non-AI fallback quiz: "which chapter contains this passage?" using this
   * book's own chapter titles. Needs at least two chapters with text; otherwise
   * no quiz is produced rather than inventing questions.
   */
  private generateFallbackQuiz(book: any): GeneratedQuiz[] {
    const chapters = (book.chapters || [])
      .map((c: any) => ({
        title: c.title as string,
        text: (c.contentBlocks || []).map((b: any) => b.text).join(' ')
      }))
      .filter((c: any) => c.text.trim().length > 0);
    const titles: string[] = Array.from(new Set<string>(chapters.map((c: any) => c.title)));
    if (titles.length < 2) return [];
    return chapters.slice(0, 4).map((c: any, idx: number) => {
      const distractors = titles.filter((t) => t !== c.title).slice(0, 3);
      const options = [...distractors];
      options.splice(idx % (distractors.length + 1), 0, c.title);
      return {
        question: `Which section of "${book.title}" contains this passage: "${truncateWords(firstSentences(c.text, 1), 30)}"?`,
        options,
        correctAnswer: c.title,
        explanation: `The passage is taken from "${c.title}".`
      };
    });
  }
}

/** Non-AI chapter summary: the chapter's own opening sentences and paragraph leads. */
function extractiveChapterSummary(paragraphs: string[]): { summary: string; keyPoints: string[]; source: 'extractive-fallback' } {
  const nonEmpty = paragraphs.filter((p) => (p || '').trim().length > 0);
  return {
    source: 'extractive-fallback',
    summary: firstSentences(nonEmpty.join(' '), 3),
    keyPoints: nonEmpty.slice(1, 4).map((p) => firstSentences(p, 1))
  };
}

/** First `n` sentences of a text (used by the extractive, non-AI fallbacks). */
function firstSentences(text: string, n: number): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const sentences = clean.match(/[^.!?]+[.!?]+(\s|$)/g) || [clean];
  return truncateWords(sentences.slice(0, n).join(' ').trim(), 60);
}

function truncateWords(text: string, maxWords: number): string {
  const words = (text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  return words.length > maxWords ? `${words.slice(0, maxWords).join(' ')}…` : words.join(' ');
}

export const aiService = new AIService();

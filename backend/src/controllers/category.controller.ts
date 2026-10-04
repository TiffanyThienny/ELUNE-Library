import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response.util';

export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { books: true } }
      },
      orderBy: { name: 'asc' }
    });

    sendSuccess(res, { categories }, 'Categories retrieved');
  } catch (error: any) {
    console.error('getCategories error:', error);
    sendError(res, 'Failed to fetch categories', error.message, 500);
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    if (!name) {
      sendError(res, 'Category name is required', 'VALIDATION_ERROR', 400);
      return;
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null
      }
    });

    sendSuccess(res, { category }, 'Category created', 201);
  } catch (error: any) {
    console.error('createCategory error:', error);
    sendError(res, 'Failed to create category', error.message, 500);
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined
      }
    });

    sendSuccess(res, { category }, 'Category updated');
  } catch (error: any) {
    console.error('updateCategory error:', error);
    sendError(res, 'Failed to update category', error.message, 500);
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.category.delete({ where: { id } });
    sendSuccess(res, { id }, 'Category deleted');
  } catch (error: any) {
    console.error('deleteCategory error:', error);
    sendError(res, 'Failed to delete category', error.message, 500);
  }
};

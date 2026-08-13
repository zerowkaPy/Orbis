import { Category, Note } from '../types';

const BASE_URL = '/api/v1';

export const api = {
  // Categories
  async getCategories(): Promise<Category[]> {
    try {
      const res = await fetch(`${BASE_URL}/categories`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async createCategory(category: { name: string; color: string }): Promise<Category> {
    const res = await fetch(`${BASE_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
    });
    if (!res.ok) throw new Error('Failed to create category');
    return res.json();
  },

  async updateCategory(id: number, data: Partial<Category>): Promise<Category> {
    const res = await fetch(`${BASE_URL}/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update category');
    return res.json();
  },

  async deleteCategory(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete category');
  },

  // Notes
  async getNotes(categoryId?: number): Promise<Note[]> {
    try {
      const url = categoryId ? `${BASE_URL}/notes?category_id=${categoryId}` : `${BASE_URL}/notes`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async createNote(note: { text: string; category_id: number }): Promise<Note> {
    const res = await fetch(`${BASE_URL}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error('Failed to create note');
    return res.json();
  },

  async updateNote(id: number, data: { text?: string; category_id?: number }): Promise<Note> {
    const res = await fetch(`${BASE_URL}/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update note');
    return res.json();
  },

  async deleteNote(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/notes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete note');
  },
};
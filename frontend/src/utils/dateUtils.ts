import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Category, Note } from '../types';
import { api } from '../services/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import { formatLocalDate, parseUtcDate } from '../utils/dateUtils';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Tag,
  FileText,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Table,
  CheckSquare,
  Eye,
  FileCode2,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';

const ITEMS_PER_PAGE = 20;

export const CategoryManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Accordion state
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);

  // Filter & Search & Pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Categories UI state
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#10b981');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatColor, setEditCatColor] = useState('#10b981');

  // Notes UI state
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [editMode, setEditMode] = useState<'original' | 'preview'>('original');

  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteEditMode, setNewNoteEditMode] = useState<'original' | 'preview'>('original');

  // Textarea refs for selection manipulation
  const editNoteTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const newNoteTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    loadCategories();
    loadNotes();
  }, []);

  // Reset pagination when category, search, or filter changes
  useEffect(() => {
    setCurrentPage(1);
    setExpandedNoteId(null);
  }, [selectedCategoryId, searchQuery, dateFilter]);

  const loadCategories = async () => {
    const data = await api.getCategories();
    setCategories(data);
  };

  const loadNotes = async () => {
    const data = await api.getNotes();
    setNotes(data);
  };

  // ----- Helper Functions -----
  
  // Извлечение самого крупного Markdown заголовка для обзора
  const extractMainHeading = (text: string): string => {
    if (!text) return 'Untitled Note';

    // Ищем заголовки #, ##, ### и т.д.
    const headingMatches = Array.from(text.matchAll(/^(#{1,6})\s+(.+)$/gm));
    
    if (headingMatches.length > 0) {
      // Сортируем по длине символов '#' (чем меньше '#', тем крупнее заголовок)
      headingMatches.sort((a, b) => a[1].length - b[1].length);
      return headingMatches[0][2].trim();
    }

    // Если нет Markdown заголовков, берём первую непустую строку
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const firstLine = lines[0].replace(/^[#*`\-\s]+/, '');
      return firstLine.length > 60 ? `${firstLine.slice(0, 60)}...` : firstLine;
    }

    return 'Untitled Note';
  };

  // ----- Category Operations -----
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const created = await api.createCategory({ name: newCatName, color: newCatColor });
    setCategories([...categories, created]);
    setNewCatName('');
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatColor(cat.color);
  };

  const handleSaveCategory = async (id: number) => {
    const updated = await api.updateCategory(id, { name: editCatName, color: editCatColor });
    setCategories(categories.map((c) => (c.id === id ? updated : c)));
    setEditingCatId(null);
  };

  const handleDeleteCategory = async (id: number) => {
    await api.deleteCategory(id);
    setCategories(categories.filter((c) => c.id !== id));
    if (selectedCategoryId === id) {
      setSelectedCategoryId(null);
      setExpandedNoteId(null);
    }
  };

  // ----- Note Operations -----
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedCategoryId) return;
    const created = await api.createNote({ text: newNoteText, category_id: selectedCategoryId });
    setNotes([created, ...notes]);
    setNewNoteText('');
    setIsCreatingNote(false);
    setExpandedNoteId(created.id);
  };

  const handleStartEditNote = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNoteId(note.id);
    setEditNoteText(note.text);
    setEditMode('original');
    setExpandedNoteId(note.id);
  };

  const handleSaveNote = async (id: number, e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) return;
    const updated = await api.updateNote(id, { text: editNoteText, category_id: selectedCategoryId });
    setNotes(notes.map((n) => (n.id === id ? updated : n)));
    setEditingNoteId(null);
  };

  const handleDeleteNote = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.deleteNote(id);
    setNotes(notes.filter((n) => n.id !== id));
    if (expandedNoteId === id) setExpandedNoteId(null);
  };

  const toggleExpandNote = (id: number) => {
    if (editingNoteId === id) return;
    setExpandedNoteId(expandedNoteId === id ? null : id);
  };

  // ----- Markdown Toolbar Actions -----
  const insertMarkdown = (
    prefix: string,
    suffix: string = '',
    placeholder: string = '',
    textareaRef: React.RefObject<HTMLTextAreaElement>,
    setTextFunc: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const selectedText = currentText.substring(start, end) || placeholder;

    const newText =
      currentText.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      currentText.substring(end);

    setTextFunc(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 0);
  };

  const renderMarkdownToolbar = (
    textareaRef: React.RefObject<HTMLTextAreaElement>,
    setTextFunc: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const actions = [
      { label: 'Bold', prefix: '**', suffix: '**', placeholder: 'bold text', icon: <Bold className="w-3.5 h-3.5" /> },
      { label: 'Italic', prefix: '*', suffix: '*', placeholder: 'italic text', icon: <Italic className="w-3.5 h-3.5" /> },
      { label: 'Strikethrough', prefix: '~~', suffix: '~~', placeholder: 'strikethrough text', icon: <Strikethrough className="w-3.5 h-3.5" /> },
      { label: 'Heading 1', prefix: '# ', suffix: '', placeholder: 'Heading 1', icon: <Heading1 className="w-3.5 h-3.5" /> },
      { label: 'Heading 2', prefix: '## ', suffix: '', placeholder: 'Heading 2', icon: <Heading2 className="w-3.5 h-3.5" /> },
      { label: 'Unordered List', prefix: '- ', suffix: '', placeholder: 'List item', icon: <List className="w-3.5 h-3.5" /> },
      { label: 'Ordered List', prefix: '1. ', suffix: '', placeholder: 'List item', icon: <ListOrdered className="w-3.5 h-3.5" /> },
      { label: 'Task List', prefix: '- [ ] ', suffix: '', placeholder: 'Task item', icon: <CheckSquare className="w-3.5 h-3.5" /> },
      { label: 'Quote', prefix: '> ', suffix: '', placeholder: 'Quote text', icon: <Quote className="w-3.5 h-3.5" /> },
      { label: 'Code Block', prefix: '```python\n', suffix: '\n```', placeholder: 'print("Hello World")', icon: <Code className="w-3.5 h-3.5" /> },
      { label: 'Link', prefix: '[', suffix: '](https://example.com)', placeholder: 'link text', icon: <Link className="w-3.5 h-3.5" /> },
      { label: 'Table', prefix: '\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n', suffix: '', placeholder: '', icon: <Table className="w-3.5 h-3.5" /> },
    ];

    return (
      <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-950/80 border border-slate-800 rounded-t-lg border-b-0">
        {actions.map((act) => (
          <button
            key={act.label}
            type="button"
            title={act.label}
            onClick={() => insertMarkdown(act.prefix, act.suffix, act.placeholder, textareaRef, setTextFunc)}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors"
          >
            {act.icon}
          </button>
        ))}
      </div>
    );
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  // ----- Filtering & Pagination Logic -----
  const filteredNotes = useMemo(() => {
    if (!selectedCategoryId) return [];

    return notes.filter((note) => {
      if (note.category_id !== selectedCategoryId) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText = note.text.toLowerCase().includes(query);
        if (!matchesText) return false;
      }

      // Date filter (с учетом локального часового пояса)
      if (dateFilter !== 'all' && note.created_at) {
        const noteDate = parseUtcDate(note.created_at);
        const now = new Date();

        if (dateFilter === 'today') {
          const isToday =
            noteDate.getDate() === now.getDate() &&
            noteDate.getMonth() === now.getMonth() &&
            noteDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (dateFilter === 'week') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (noteDate < sevenDaysAgo) return false;
        } else if (dateFilter === 'month') {
          const isThisMonth =
            noteDate.getMonth() === now.getMonth() &&
            noteDate.getFullYear() === now.getFullYear();
          if (!isThisMonth) return false;
        }
      }

      return true;
    });
  }, [notes, selectedCategoryId, searchQuery, dateFilter]);

  const totalPages = Math.ceil(filteredNotes.length / ITEMS_PER_PAGE) || 1;
  const paginatedNotes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredNotes.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredNotes, currentPage]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto w-full py-6">
      {/* LEFT COLUMN: Categories */}
      <div className="space-y-6 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/60 backdrop-blur-md self-start">
        <h2 className="text-lg font-medium text-slate-200 flex items-center gap-2">
          <Tag className="w-5 h-5 text-teal-400" /> Categories
        </h2>

        {/* Create Category Form */}
        <form onSubmit={handleCreateCategory} className="space-y-3">
          <input
            type="text"
            placeholder="Category name..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Color:</label>
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="w-8 h-8 rounded bg-transparent cursor-pointer border-none"
            />
            <button
              type="submit"
              className="ml-auto flex items-center gap-1 bg-teal-600/30 border border-teal-500/40 text-teal-200 text-xs px-3 py-1.5 rounded-lg hover:bg-teal-600/50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Create
            </button>
          </div>
        </form>

        {/* Category List */}
        <div className="space-y-2 pt-2">
          {categories.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-4">No categories available</p>
          ) : (
            categories.map((cat) => {
              const count = notes.filter((n) => n.category_id === cat.id).length;
              const isSelected = selectedCategoryId === cat.id;

              return (
                <div
                  key={cat.id}
                  className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-slate-800/80 border-teal-500/50 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/40 hover:bg-slate-900/60'
                  }`}
                >
                  {editingCatId === cat.id ? (
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="color"
                        value={editCatColor}
                        onChange={(e) => setEditCatColor(e.target.value)}
                        className="w-6 h-6 rounded bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 px-2 py-1 text-xs text-slate-100 rounded"
                      />
                      <button onClick={() => handleSaveCategory(cat.id)} className="text-emerald-400 hover:text-emerald-300">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingCatId(null)} className="text-slate-500 hover:text-slate-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setSelectedCategoryId(cat.id);
                          setExpandedNoteId(null);
                        }}
                        className="flex items-center gap-2.5 text-xs text-slate-300 hover:text-slate-100 text-left truncate flex-1"
                      >
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className={`truncate ${isSelected ? 'font-semibold text-teal-300' : ''}`}>{cat.name}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                          {count}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleStartEditCategory(cat)} className="text-slate-400 hover:text-slate-200 p-0.5">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="text-rose-400 hover:text-rose-300 p-0.5">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Notes List */}
      <div className="md:col-span-2 space-y-6">
        {!selectedCategoryId ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl text-center p-6">
            <FolderOpen className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-medium text-slate-300">No Category Selected</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Select a category from the left sidebar to view its associated notes.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: selectedCategory?.color }} />
                <h2 className="text-lg font-medium text-slate-100">{selectedCategory?.name}</h2>
                <span className="text-xs text-slate-500">({filteredNotes.length})</span>
              </div>

              <button
                onClick={() => {
                  setIsCreatingNote(!isCreatingNote);
                  setNewNoteEditMode('original');
                }}
                className="flex items-center gap-1.5 bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-600/50 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Note
              </button>
            </div>

            {/* SEARCH & FILTERS BAR */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/60">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">All time</option>
                  <option value="today" className="bg-slate-900 text-slate-200">Today</option>
                  <option value="week" className="bg-slate-900 text-slate-200">Last 7 days</option>
                  <option value="month" className="bg-slate-900 text-slate-200">This month</option>
                </select>
              </div>
            </div>

            {/* Create Note Form */}
            {isCreatingNote && (
              <form onSubmit={handleCreateNote} className="p-4 bg-slate-900/60 rounded-xl border border-indigo-500/30 space-y-3 backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                  <span className="text-xs font-medium text-indigo-300">New Note</span>
                  <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setNewNoteEditMode('original')}
                      className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                        newNoteEditMode === 'original'
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileCode2 className="w-3 h-3" /> original
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewNoteEditMode('preview')}
                      className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                        newNoteEditMode === 'preview'
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Eye className="w-3 h-3" /> preview
                    </button>
                  </div>
                </div>

                {newNoteEditMode === 'original' ? (
                  <div className="space-y-0">
                    {renderMarkdownToolbar(newNoteTextareaRef, setNewNoteText)}
                    <textarea
                      ref={newNoteTextareaRef}
                      rows={5}
                      placeholder="Type your note in Markdown format..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-b-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg min-h-[140px]">
                    {newNoteText ? (
                      <MarkdownRenderer content={newNoteText} />
                    ) : (
                      <span className="text-slate-500 italic text-xs">Nothing to preview...</span>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNote(false)}
                    className="text-xs text-slate-400 hover:text-slate-300 px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white text-xs px-4 py-1.5 rounded-lg hover:bg-indigo-500 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            {/* Notes List (Accordion) */}
            <div className="space-y-3">
              {paginatedNotes.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-12 bg-slate-900/20 rounded-xl border border-slate-800/40">
                  {filteredNotes.length === 0 && (searchQuery || dateFilter !== 'all')
                    ? 'No notes match your filter criteria.'
                    : 'No notes found in this category.'}
                </p>
              ) : (
                paginatedNotes.map((note) => {
                  const isExpanded = expandedNoteId === note.id;

                  return (
                    <div
                      key={note.id}
                      className={`rounded-xl border transition-all duration-200 bg-slate-900/40 backdrop-blur-md ${
                        isExpanded ? 'border-indigo-500/50 shadow-md' : 'border-slate-800/60 hover:border-slate-700/60'
                      }`}
                    >
                      {/* NOTE HEADER */}
                      <div
                        onClick={() => toggleExpandNote(note.id)}
                        className="p-4 flex items-center justify-between cursor-pointer select-none gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <FileText className={`w-4 h-4 flex-shrink-0 ${isExpanded ? 'text-indigo-400' : 'text-slate-500'}`} />
                          <p className="text-xs text-slate-200 truncate font-semibold">
                            {extractMainHeading(note.text)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Created_at date in overview */}
                          {note.created_at && (
                            <span className="hidden sm:flex items-center gap-1 text-[10px] text-slate-500">
                              <Clock className="w-3 h-3" />
                              {formatLocalDate(note.created_at)}
                            </span>
                          )}

                          <button
                            onClick={(e) => handleStartEditNote(note, e)}
                            className="text-slate-400 hover:text-slate-200 p-1"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteNote(note.id, e)}
                            className="text-rose-400 hover:text-rose-300 p-1"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* NOTE BODY */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-800/60">
                          {/* Created_at date in detailed view */}
                          {note.created_at && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-3 pb-2 border-b border-slate-800/40">
                              <Clock className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Created on: {formatLocalDate(note.created_at)}</span>
                            </div>
                          )}

                          {editingNoteId === note.id ? (
                            /* EDIT MODE */
                            <form onSubmit={(e) => handleSaveNote(note.id, e)} className="space-y-3 pt-2">
                              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                                <span className="text-xs font-medium text-slate-400">Editing Mode</span>
                                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                                  <button
                                    type="button"
                                    onClick={() => setEditMode('original')}
                                    className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                                      editMode === 'original'
                                        ? 'bg-indigo-600 text-white font-medium'
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    <FileCode2 className="w-3 h-3" /> original
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditMode('preview')}
                                    className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                                      editMode === 'preview'
                                        ? 'bg-indigo-600 text-white font-medium'
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    <Eye className="w-3 h-3" /> preview
                                  </button>
                                </div>
                              </div>

                              {editMode === 'original' ? (
                                <div className="space-y-0">
                                  {renderMarkdownToolbar(editNoteTextareaRef, setEditNoteText)}
                                  <textarea
                                    ref={editNoteTextareaRef}
                                    rows={7}
                                    value={editNoteText}
                                    onChange={(e) => setEditNoteText(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-b-lg p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                              ) : (
                                <div className="p-3 bg-slate-950 border border-slate-700 rounded-lg min-h-[160px]">
                                  <MarkdownRenderer content={editNoteText} />
                                </div>
                              )}

                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingNoteId(null)}
                                  className="text-xs text-slate-400 hover:text-slate-300 px-3 py-1.5"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg transition-colors"
                                >
                                  Save Changes
                                </button>
                              </div>
                            </form>
                          ) : (
                            /* READ ONLY VIEW */
                            <div className="pt-2">
                              <MarkdownRenderer content={note.text} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 text-xs">
                <span className="text-slate-500">
                  Page {currentPage} of {totalPages} ({filteredNotes.length} notes)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
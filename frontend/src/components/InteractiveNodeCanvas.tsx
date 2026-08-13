import React, { useState, useEffect, useRef } from 'react';
import { Category, Note } from '../types';
import { api } from '../services/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import {
  X,
  FileCode2,
  Eye,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Link,
  Table,
  RefreshCw,
  Clock,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ArrowLeft,
  Mic,
  Layers,
  Filter,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface PhysicsCategory {
  id: number;
  name: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isExpanded: boolean;
  width: number;
  height: number;
}

interface PhysicsNote {
  id: number;
  categoryId: number;
  text: string;
  created_at?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  isDragged: boolean;
  randomAngle: number;
  randomRadiusFactor: number;
  animProgress: number;
  opacity: number;
  scale: number;
}

interface InteractiveNodeCanvasProps {
  onNavigate?: (view: 'recorder' | 'categories' | 'notes' | string) => void;
  onClose?: () => void;
}

export const InteractiveNodeCanvas: React.FC<InteractiveNodeCanvasProps> = ({
  onNavigate,
  onClose,
}) => {
  // API Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  // Category Filter State
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(true);
  const selectedCategoryIdsRef = useRef<Set<number>>(new Set());

  // Keep ref synchronized for smooth 60fps canvas loop
  useEffect(() => {
    selectedCategoryIdsRef.current = selectedCategoryIds;
  }, [selectedCategoryIds]);

  // Drawer state (По умолчанию режим 'preview')
  const [activeDrawerNote, setActiveDrawerNote] = useState<Note | null>(null);
  const [drawerText, setDrawerText] = useState('');
  const [drawerCategoryId, setDrawerCategoryId] = useState<number | null>(null);
  const [drawerMode, setDrawerMode] = useState<'original' | 'preview'>('preview');

  // Pan & Zoom State / Refs for smooth operations
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const scaleRef = useRef<number>(1);
  const [zoomDisplay, setZoomDisplay] = useState<number>(100);

  // Canvas & Physics Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const categoriesRef = useRef<PhysicsCategory[]>([]);
  const notesRef = useRef<PhysicsNote[]>([]);

  // Interaction Tracking Refs
  const dragTargetRef = useRef<{
    type: 'category' | 'note';
    id: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);

  const drawerTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 1. Data Loading
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeDrawerNote && drawerMode === 'original' && drawerTextareaRef.current) {
      const textarea = drawerTextareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(180, textarea.scrollHeight)}px`;
    }
  }, [drawerText, drawerMode, activeDrawerNote]);

  const loadData = async () => {
    const [catData, noteData] = await Promise.all([
      api.getCategories(),
      api.getNotes(),
    ]);
    setCategories(catData);
    setNotes(noteData);

    // By default, show all categories
    const allCatIds = new Set(catData.map((c) => c.id));
    setSelectedCategoryIds(allCatIds);
    selectedCategoryIdsRef.current = allCatIds;

    initPhysicsObjects(catData, noteData);
  };

  const toggleCategoryVisibility = (catId: number) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  const toggleAllCategories = () => {
    if (selectedCategoryIds.size === categories.length) {
      setSelectedCategoryIds(new Set());
    } else {
      setSelectedCategoryIds(new Set(categories.map((c) => c.id)));
    }
  };

  // Helper: Convert Screen Space coordinates to World Space
  const screenToWorld = (screenX: number, screenY: number) => {
    return {
      x: (screenX - panRef.current.x) / scaleRef.current,
      y: (screenY - panRef.current.y) / scaleRef.current,
    };
  };

  // Helper: Extract main heading from markdown
  const extractMainHeading = (text: string): string => {
    if (!text) return 'Untitled Note';

    const headingMatches = Array.from(text.matchAll(/^(#{1,6})\s+(.+)$/gm));
    if (headingMatches.length > 0) {
      headingMatches.sort((a, b) => a[1].length - b[1].length);
      return headingMatches[0][2].trim();
    }

    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const firstLine = lines[0].replace(/^[#*`\-\s]+/, '');
      return firstLine.length > 30 ? `${firstLine.slice(0, 30)}...` : firstLine;
    }

    return 'Untitled Note';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const initPhysicsObjects = (cats: Category[], nts: Note[]) => {
    const width = window.innerWidth || 1200;
    const height = window.innerHeight || 800;

    const catPhysics: PhysicsCategory[] = cats.map((cat, idx) => {
      const angle = (idx / Math.max(cats.length, 1)) * Math.PI * 2;
      const radius = Math.min(width, height) * 0.25;
      return {
        id: cat.id,
        name: cat.name,
        color: cat.color || '#10b981',
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        isExpanded: false,
        width: Math.max(120, cat.name.length * 10 + 40),
        height: 44,
      };
    });

    const notePhysics: PhysicsNote[] = nts.map((note) => {
      const parentCat = catPhysics.find((c) => c.id === note.category_id);
      const startX = parentCat ? parentCat.x : width / 2;
      const startY = parentCat ? parentCat.y : height / 2;

      return {
        id: note.id,
        categoryId: note.category_id,
        text: note.text,
        created_at: note.created_at,
        x: startX,
        y: startY,
        vx: 0,
        vy: 0,
        targetX: startX,
        targetY: startY,
        isDragged: false,
        randomAngle: Math.random() * Math.PI * 2,
        randomRadiusFactor: 0.8 + Math.random() * 0.5,
        animProgress: 0,
        opacity: 0,
        scale: 0.2,
      };
    });

    categoriesRef.current = catPhysics;
    notesRef.current = notePhysics;
  };

  // Wheel Zoom Listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      zoomAt(screenX, screenY, zoomFactor);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  const zoomAt = (screenX: number, screenY: number, factor: number) => {
    const currentScale = scaleRef.current;
    const newScale = Math.min(Math.max(currentScale * factor, 0.25), 3.0);

    const worldPos = screenToWorld(screenX, screenY);
    panRef.current = {
      x: screenX - worldPos.x * newScale,
      y: screenY - worldPos.y * newScale,
    };
    scaleRef.current = newScale;
    setZoomDisplay(Math.round(newScale * 100));
  };

  const handleZoomIn = () => {
    const width = window.innerWidth / 2;
    const height = window.innerHeight / 2;
    zoomAt(width, height, 1.2);
  };

  const handleZoomOut = () => {
    const width = window.innerWidth / 2;
    const height = window.innerHeight / 2;
    zoomAt(width, height, 0.8);
  };

  const handleResetView = () => {
    panRef.current = { x: 0, y: 0 };
    scaleRef.current = 1;
    setZoomDisplay(100);
    loadData();
  };

  // Animation & Physics Loop
  useEffect(() => {
    let animationFrameId: number;

    const updatePhysics = () => {
      const visibleCatIds = selectedCategoryIdsRef.current;
      const cats = categoriesRef.current.filter((c) => visibleCatIds.has(c.id));
      const nts = notesRef.current.filter((n) => visibleCatIds.has(n.categoryId));

      cats.forEach((cat) => {
        const catNotes = nts.filter((n) => n.categoryId === cat.id);
        const count = catNotes.length;
        const baseOrbitRadius = Math.max(130, count * 18);

        catNotes.forEach((note) => {
          const targetProgress = cat.isExpanded ? 1 : 0;
          note.animProgress += (targetProgress - note.animProgress) * 0.08;

          const currentRadius = baseOrbitRadius * note.randomRadiusFactor * note.animProgress;
          note.targetX = cat.x + Math.cos(note.randomAngle) * currentRadius;
          note.targetY = cat.y + Math.sin(note.randomAngle) * currentRadius;

          note.opacity = Math.max(0, Math.min(1, note.animProgress * 1.2));
          note.scale = 0.3 + note.animProgress * 0.7;

          // Плавное возвращение к целевой позиции, если заметка не перетаскивается
          if (!note.isDragged) {
            note.x += (note.targetX - note.x) * 0.1;
            note.y += (note.targetY - note.y) * 0.1;
          }
        });
      });

      // Handle collisions between visible categories
      for (let i = 0; i < cats.length; i++) {
        for (let j = i + 1; j < cats.length; j++) {
          const c1 = cats[i];
          const c2 = cats[j];

          const c1NotesCount = nts.filter((n) => n.categoryId === c1.id).length;
          const c2NotesCount = nts.filter((n) => n.categoryId === c2.id).length;

          const r1 = c1.isExpanded ? Math.max(130, c1NotesCount * 18) + 40 : 60;
          const r2 = c2.isExpanded ? Math.max(130, c2NotesCount * 18) + 40 : 60;

          const dx = c2.x - c1.x;
          const dy = c2.y - c1.y;
          const dist = Math.hypot(dx, dy);
          const minDist = r1 + r2;

          if (dist < minDist && dist > 0) {
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            const pushFactor = 0.3;
            if (!dragTargetRef.current || dragTargetRef.current.id !== c1.id) {
              c1.x -= nx * overlap * pushFactor;
              c1.y -= ny * overlap * pushFactor;
            }
            if (!dragTargetRef.current || dragTargetRef.current.id !== c2.id) {
              c2.x += nx * overlap * pushFactor;
              c2.y += ny * overlap * pushFactor;
            }
          }
        }
      }
    };

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const displayWidth = window.innerWidth;
      const displayHeight = window.innerHeight;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      ctx.save();
      ctx.translate(panRef.current.x, panRef.current.y);
      ctx.scale(scaleRef.current, scaleRef.current);

      // Grid pattern calculation
      const scale = scaleRef.current;
      const pan = panRef.current;
      const dotSpacing = 32;

      const startX = Math.floor(-pan.x / scale / dotSpacing) * dotSpacing - dotSpacing;
      const endX = Math.ceil((displayWidth - pan.x) / scale / dotSpacing) * dotSpacing + dotSpacing;
      const startY = Math.floor(-pan.y / scale / dotSpacing) * dotSpacing - dotSpacing;
      const endY = Math.ceil((displayHeight - pan.y) / scale / dotSpacing) * dotSpacing + dotSpacing;

      ctx.fillStyle = '#334155';
      for (let x = startX; x <= endX; x += dotSpacing) {
        for (let y = startY; y <= endY; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2 / Math.sqrt(scale), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const visibleCatIds = selectedCategoryIdsRef.current;
      const cats = categoriesRef.current.filter((c) => visibleCatIds.has(c.id));
      const nts = notesRef.current.filter((n) => visibleCatIds.has(n.categoryId));

      // Render connection lines (с учетом центра тяжести и отсоединения)
      cats.forEach((cat) => {
        const catNotes = nts.filter((n) => n.categoryId === cat.id);
        catNotes.forEach((note) => {
          if (note.opacity < 0.02) return;

          let targetCategory = cat;
          let isDetached = false;

          // Динамический визуальный расчет при перетаскивании
          if (note.isDragged) {
            const distToHome = Math.hypot(note.x - cat.x, note.y - cat.y);
            // Уменьшено расстояние для отображения визуального отсоединения заметки
            if (distToHome > 100) {
              isDetached = true;
            }

            // Проверяем близость к другим категориям для "магнита"
            let nearestCat: PhysicsCategory | null = null;
            let minDist = Infinity;
            cats.forEach((c) => {
              const d = Math.hypot(note.x - c.x, note.y - c.y);
              if (d < minDist) {
                minDist = d;
                nearestCat = c;
              }
            });

            if (nearestCat && minDist < 150) {
              targetCategory = nearestCat;
              isDetached = false;
            }
          }

          ctx.save();
          ctx.globalAlpha = isDetached ? note.opacity * 0.25 : note.opacity * 0.6;

          ctx.beginPath();
          ctx.moveTo(targetCategory.x, targetCategory.y);

          const midX = (targetCategory.x + note.x) / 2;
          const midY = (targetCategory.y + note.y) / 2;
          const curveOffset = Math.sin(Date.now() * 0.002 + note.id) * 6 * note.animProgress;

          ctx.quadraticCurveTo(midX + curveOffset, midY + curveOffset, note.x, note.y);
          ctx.strokeStyle = isDetached ? '#ef4444' : targetCategory.color;
          ctx.lineWidth = note.isDragged ? 2 : 1.5;
          ctx.setLineDash(note.isDragged ? [6, 6] : [4, 4]);
          ctx.stroke();

          ctx.restore();
        });
      });

      // Render note cards
      cats.forEach((cat) => {
        const catNotes = nts.filter((n) => n.categoryId === cat.id);
        catNotes.forEach((note) => {
          if (note.opacity < 0.02) return;

          ctx.save();
          ctx.globalAlpha = note.opacity;

          const cardWidth = 130 * note.scale;
          const cardHeight = 44 * note.scale;
          const x = note.x - cardWidth / 2;
          const y = note.y - cardHeight / 2;

          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 8 * note.scale;
          ctx.shadowOffsetY = 3 * note.scale;

          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.roundRect(x, y, cardWidth, cardHeight, 10 * note.scale);
          ctx.fill();

          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = note.isDragged ? '#818cf8' : `${cat.color}66`;
          ctx.lineWidth = note.isDragged ? 2 : 1;
          ctx.stroke();

          if (note.animProgress > 0.4) {
            ctx.fillStyle = '#f8fafc';
            ctx.font = `500 ${Math.round(11 * note.scale)}px Inter, system-ui, -apple-system, sans-serif`;
            ctx.textBaseline = 'middle';
            const title = extractMainHeading(note.text);
            const truncated = title.length > 14 ? title.slice(0, 14) + '...' : title;
            ctx.fillText(truncated, x + 10 * note.scale, y + cardHeight / 2);
          }

          ctx.restore();
        });
      });

      // Render category nodes
      cats.forEach((cat) => {
        const x = cat.x - cat.width / 2;
        const y = cat.y - cat.height / 2;

        if (cat.isExpanded) {
          ctx.shadowColor = cat.color;
          ctx.shadowBlur = 14;
        } else {
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 6;
        }

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(x, y, cat.width, cat.height, 14);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = cat.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = cat.color;
        ctx.beginPath();
        ctx.arc(x + 18, cat.y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f1f5f9';
        ctx.font = '600 12px Inter, system-ui, -apple-system, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(cat.name, x + 30, cat.y);
      });

      ctx.restore();
      ctx.restore();
    };

    const loop = () => {
      updatePhysics();
      render();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [categories, notes]);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    mouseDownPosRef.current = { x: sx, y: sy };
    isDraggingRef.current = false;

    const world = screenToWorld(sx, sy);
    const visibleCatIds = selectedCategoryIdsRef.current;
    const cats = categoriesRef.current.filter((c) => visibleCatIds.has(c.id));
    const nts = notesRef.current.filter((n) => visibleCatIds.has(n.categoryId));

    // Check hit on notes
    for (const cat of cats) {
      if (cat.isExpanded) {
        const catNotes = nts.filter((n) => n.categoryId === cat.id && n.animProgress > 0.5);
        for (const note of catNotes) {
          if (Math.hypot(note.x - world.x, note.y - world.y) < 28) {
            note.isDragged = true;
            dragTargetRef.current = {
              type: 'note',
              id: note.id,
              offsetX: world.x - note.x,
              offsetY: world.y - note.y,
            };
            return;
          }
        }
      }
    }

    // Check hit on categories
    for (const cat of cats) {
      if (
        world.x >= cat.x - cat.width / 2 &&
        world.x <= cat.x + cat.width / 2 &&
        world.y >= cat.y - cat.height / 2 &&
        world.y <= cat.y + cat.height / 2
      ) {
        dragTargetRef.current = {
          type: 'category',
          id: cat.id,
          offsetX: world.x - cat.x,
          offsetY: world.y - cat.y,
        };
        return;
      }
    }

    // Canvas panning
    isPanningRef.current = true;
    panStartRef.current = {
      x: sx - panRef.current.x,
      y: sy - panRef.current.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const distMoved = Math.hypot(
      sx - mouseDownPosRef.current.x,
      sy - mouseDownPosRef.current.y
    );

    if (distMoved > 4) {
      isDraggingRef.current = true;
    }

    if (isPanningRef.current) {
      panRef.current = {
        x: sx - panStartRef.current.x,
        y: sy - panStartRef.current.y,
      };
      return;
    }

    if (!dragTargetRef.current) return;

    const world = screenToWorld(sx, sy);
    const { type, id, offsetX, offsetY } = dragTargetRef.current;

    if (type === 'category') {
      const cat = categoriesRef.current.find((c) => c.id === id);
      if (cat) {
        cat.x = world.x - offsetX;
        cat.y = world.y - offsetY;
      }
    } else if (type === 'note') {
      const note = notesRef.current.find((n) => n.id === id);
      if (note) {
        note.x = world.x - offsetX;
        note.y = world.y - offsetY;
      }
    }
  };

  // Логика отсоединения и переприсвоения при отпускании мыши с запросом на бэкенд
  const handleMouseUp = async () => {
    if (dragTargetRef.current?.type === 'note') {
      const noteId = dragTargetRef.current.id;
      const note = notesRef.current.find((n) => n.id === noteId);

      if (note) {
        note.isDragged = false;

        const visibleCatIds = selectedCategoryIdsRef.current;
        const cats = categoriesRef.current.filter((c) => visibleCatIds.has(c.id));

        // Находим ближайшую категорию к месту отпускания заметки
        let nearestCat: PhysicsCategory | null = null;
        let minDistance = Infinity;

        cats.forEach((cat) => {
          const dist = Math.hypot(note.x - cat.x, note.y - cat.y);
          if (dist < minDistance) {
            minDistance = dist;
            nearestCat = cat;
          }
        });

        const ATTACH_THRESHOLD = 150; // Радиус притяжения к новой категории

        // Если заметка отпущена достаточно близко к другой категории, обновляем категорию заметки
        if (nearestCat && minDistance < ATTACH_THRESHOLD && (nearestCat as PhysicsCategory).id !== note.categoryId) {
          const newCatId = (nearestCat as PhysicsCategory).id;

          // Обновляем физический объект локально для плавной анимации
          note.categoryId = newCatId;
          note.randomAngle = Math.random() * Math.PI * 2;

          // Обновляем локальный стейт
          setNotes((prevNotes) =>
            prevNotes.map((n) => (n.id === note.id ? { ...n, category_id: newCatId } : n))
          );

          // Отправляем PATCH-запрос на бэкенд
          try {
            await api.updateNote(note.id, { category_id: newCatId });
          } catch (err) {
            console.error('Failed to update note category via API:', err);
          }
        }
      }
    }
    dragTargetRef.current = null;
    isPanningRef.current = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    const visibleCatIds = selectedCategoryIdsRef.current;
    const cats = categoriesRef.current.filter((c) => visibleCatIds.has(c.id));

    cats.forEach((cat) => {
      if (
        world.x >= cat.x - cat.width / 2 &&
        world.x <= cat.x + cat.width / 2 &&
        world.y >= cat.y - cat.height / 2 &&
        world.y <= cat.y + cat.height / 2
      ) {
        if (!cat.isExpanded) {
          const catNotes = notesRef.current.filter((n) => n.categoryId === cat.id);
          catNotes.forEach((n) => {
            n.randomAngle = Math.random() * Math.PI * 2;
            n.randomRadiusFactor = 0.8 + Math.random() * 0.5;
          });
        }
        cat.isExpanded = !cat.isExpanded;
      }
    });
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    const visibleCatIds = selectedCategoryIdsRef.current;
    const cats = categoriesRef.current.filter((c) => visibleCatIds.has(c.id));
    const nts = notesRef.current.filter((n) => visibleCatIds.has(n.categoryId));

    for (const cat of cats) {
      if (cat.isExpanded) {
        const catNotes = nts.filter((n) => n.categoryId === cat.id && n.animProgress > 0.5);
        for (const notePhysics of catNotes) {
          if (Math.hypot(notePhysics.x - world.x, notePhysics.y - world.y) < 28) {
            const rawNote = notes.find((n) => n.id === notePhysics.id);
            if (rawNote) {
              openDrawer(rawNote);
            }
            return;
          }
        }
      }
    }
  };

  // Drawer Operations (Открытие по умолчанию в режиме preview)
  const openDrawer = (note: Note) => {
    setActiveDrawerNote(note);
    setDrawerText(note.text);
    setDrawerCategoryId(note.category_id);
    setDrawerMode('preview');
  };

  const closeDrawer = () => {
    setActiveDrawerNote(null);
  };

  const handleSaveDrawerNote = async () => {
    if (!activeDrawerNote || !drawerCategoryId) return;

    const updated = await api.updateNote(activeDrawerNote.id, {
      text: drawerText,
      category_id: drawerCategoryId,
    });

    setNotes(notes.map((n) => (n.id === updated.id ? updated : n)));

    const physNote = notesRef.current.find((n) => n.id === updated.id);
    if (physNote) {
      physNote.text = updated.text;
      physNote.categoryId = updated.category_id;
    }

    closeDrawer();
  };

  const insertMarkdown = (prefix: string, suffix: string = '', placeholder: string = 'text') => {
    const textarea = drawerTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end) || placeholder;

    const newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
    setDrawerText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    }, 0);
  };

  const renderMarkdownToolbar = () => {
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
      <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-950 border border-slate-800 rounded-t-xl border-b-0">
        {actions.map((act) => (
          <button
            key={act.label}
            type="button"
            title={act.label}
            onClick={() => insertMarkdown(act.prefix, act.suffix, act.placeholder)}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
          >
            {act.icon}
          </button>
        ))}
      </div>
    );
  };

  const isAllSelected = categories.length > 0 && selectedCategoryIds.size === categories.length;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* Top Left Navigation Bar */}
      <div className="absolute top-6 left-6 z-10 flex items-center gap-2 bg-slate-900/80 p-1.5 border border-slate-800 rounded-2xl backdrop-blur-md shadow-xl">
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-md shadow-indigo-600/30"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Mode</span>
          </button>
        )}

        {onNavigate && (
          <>
            <button
              onClick={() => onNavigate('recorder')}
              className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl text-xs font-medium transition-colors"
            >
              <Mic className="w-4 h-4 text-indigo-400" />
              <span>Voice Recorder</span>
            </button>

            <button
              onClick={() => onNavigate('categories')}
              className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl text-xs font-medium transition-colors"
            >
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Category Manager</span>
            </button>
          </>
        )}
      </div>

      {/* Left Sidebar Category Filter Menu */}
      <div
        className={`absolute top-20 left-6 z-10 transition-all duration-300 ease-in-out ${
          isFilterOpen ? 'w-64' : 'w-12'
        }`}
      >
        <div className="bg-slate-900/85 border border-slate-800/80 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 text-slate-200 hover:text-white text-xs font-semibold focus:outline-none"
            >
              <Filter className="w-4 h-4 text-indigo-400 shrink-0" />
              {isFilterOpen && <span>Category Filters</span>}
            </button>

            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isFilterOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {/* Filter Items */}
          {isFilterOpen && (
            <div className="p-3 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                <span className="text-[11px] font-medium text-slate-400">
                  {selectedCategoryIds.size} of {categories.length} active
                </span>
                <button
                  onClick={toggleAllCategories}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-1 pt-1">
                {categories.length === 0 ? (
                  <div className="text-xs text-slate-500 italic text-center py-2">
                    No categories found
                  </div>
                ) : (
                  categories.map((cat) => {
                    const isChecked = selectedCategoryIds.has(cat.id);
                    const noteCount = notes.filter((n) => n.category_id === cat.id).length;

                    return (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategoryVisibility(cat.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all ${
                          isChecked
                            ? 'bg-slate-800/60 text-slate-100 hover:bg-slate-800'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                              isChecked
                                ? 'border-indigo-500 bg-indigo-600/30 text-indigo-300'
                                : 'border-slate-700 bg-slate-950/50'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[2.5]" />}
                          </div>

                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color || '#10b981' }}
                          />

                          <span className="truncate font-medium">{cat.name}</span>
                        </div>

                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800/80 ml-2">
                          {noteCount}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Right Zoom & Controls Overlay */}
      <div className="absolute top-6 right-6 z-10 flex items-center gap-2 bg-slate-900/80 p-1.5 border border-slate-800 rounded-2xl backdrop-blur-md shadow-xl">
        <button
          onClick={handleZoomIn}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <span className="text-xs font-mono font-medium text-slate-400 px-1 min-w-[42px] text-center">
          {zoomDisplay}%
        </span>

        <button
          onClick={handleZoomOut}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-800 mx-0.5" />

        <button
          onClick={handleResetView}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          title="Reset Zoom & Position"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => loadData()}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          title="Reload Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Slide-over Drawer Panel */}
      {activeDrawerNote && (
        <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-slate-900/95 border-l border-slate-800/80 backdrop-blur-xl shadow-2xl z-50 flex flex-col transition-all duration-300 ease-in-out">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Note View
            </span>
            <button
              onClick={closeDrawer}
              className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {activeDrawerNote.created_at && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 pb-2 border-b border-slate-800/60">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Created on: {formatDate(activeDrawerNote.created_at)}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Note Category</label>
              <select
                value={drawerCategoryId || ''}
                onChange={(e) => setDrawerCategoryId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
              <span className="text-xs font-medium text-slate-400">Content</span>
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDrawerMode('original')}
                  className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                    drawerMode === 'original'
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode2 className="w-3 h-3" /> original
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerMode('preview')}
                  className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                    drawerMode === 'preview'
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3 h-3" /> preview
                </button>
              </div>
            </div>

            {drawerMode === 'original' ? (
              <div className="space-y-0">
                {renderMarkdownToolbar()}
                <textarea
                  ref={drawerTextareaRef}
                  rows={8}
                  value={drawerText}
                  onChange={(e) => setDrawerText(e.target.value)}
                  placeholder="Type your note content in Markdown format..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-b-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500 resize-none overflow-hidden min-h-[200px]"
                />
              </div>
            ) : (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl min-h-[240px]">
                {drawerText ? (
                  <MarkdownRenderer content={drawerText} />
                ) : (
                  <span className="text-slate-500 italic text-xs">Nothing to preview...</span>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-800/80 flex items-center justify-end gap-3 bg-slate-950/40">
            <button
              onClick={closeDrawer}
              className="text-xs text-slate-400 hover:text-slate-200 px-4 py-2"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDrawerNote}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2 rounded-xl transition-colors font-medium shadow-lg shadow-indigo-600/20"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
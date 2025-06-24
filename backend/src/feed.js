import fs from 'fs';
import path from 'path';

// Загружаем список источников с координатами
const sourcesPath = path.join(process.cwd(), 'src', 'sources.json');
const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));

// Евклидово расстояние
function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// Находит N ближайших источников к точке (x, y)
function findClosestSources(x, y, n = 2) {
  return sources
    .map(src => ({ ...src, dist: distance({ x, y }, src) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, n);
}

// Формирует массив из 2 friendly и 2 opposing источников
export function pickSources(x, y) {
  const friendly = findClosestSources(x, y, 2);
  const opposing = findClosestSources(-x, -y, 2);
  // Исключаем дубли
  const all = [...friendly, ...opposing.filter(o => !friendly.some(f => f.id === o.id))];
  return all.slice(0, 4).map(src => ({
    id: src.id,
    name: src.name,
    side: friendly.some(f => f.id === src.id) ? 'friendly' : 'opposing',
    x: src.x,
    y: src.y
  }));
} 
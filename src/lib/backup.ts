// Copia de seguridad: solo objetos y módulos. Al importar se suman a los existentes sin duplicar.

export interface BackupModuleOption {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
}

export interface BackupModule {
  id: string | number;
  title: string;
  subtitle: string;
  icon: string;
  colorClass: string;
  enabled: boolean;
  selectedOption: string;
  options: BackupModuleOption[];
}

export interface BackupItem {
  id: string | number;
  name: string;
  category: string;
  icon: string;
  gradientClass: string;
  packed: boolean;
}

export interface MergeResult<I, M> {
  items: I[];
  modules: M[];
  addedItems: number;
  skippedItems: number;
  addedModules: number;
  mergedModules: number;
}

const normalize = (text: string) => (text || '').trim().toLowerCase();

const asText = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() ? value : typeof value === 'number' ? String(value) : fallback;

const asArray = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  // Some backups store lists as JSON strings (e.g. module options straight from the DB)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

/**
 * Lee el texto de un archivo de copia (versiones nuevas y viejas) y devuelve objetos y módulos
 * con todos los campos obligatorios completos, para que el servidor no rechace la copia.
 * Devuelve null si el archivo no es JSON.
 */
export function parseBackup(text: string): { items: BackupItem[]; modules: BackupModule[] } | null {
  let data: any;
  try {
    // Strip a BOM or stray whitespace some phones add when saving the download
    data = JSON.parse(text.replace(/^﻿/, '').trim());
    // A backup re-saved as text can end up as a JSON string holding the JSON
    if (typeof data === 'string') data = JSON.parse(data);
  } catch (e) {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  // Accept the lists at the top level or wrapped in a "data" object
  const source = data.catalogItems || data.customModules ? data : data.data || {};

  const modules: BackupModule[] = asArray(source.customModules)
    .filter((m) => m && typeof m === 'object' && asText(m.title, ''))
    .map((m, i) => ({
      id: asText(m.id, `mod_${i}`),
      title: asText(m.title, ''),
      subtitle: asText(m.subtitle, ''),
      icon: asText(m.icon, 'fa-solid fa-layer-group'),
      colorClass: asText(m.colorClass, 'grad-sky'),
      enabled: m.enabled !== false,
      selectedOption: asText(m.selectedOption, ''),
      options: asArray(m.options)
        .filter((o) => o && typeof o === 'object' && asText(o.name, ''))
        .map((o, j) => ({
          id: asText(o.id, `opt_${i}_${j}`),
          name: asText(o.name, ''),
          icon: asText(o.icon, 'fa-solid fa-check'),
          enabled: o.enabled !== false,
        })),
    }));

  const items: BackupItem[] = asArray(source.catalogItems)
    .filter((it) => it && typeof it === 'object' && asText(it.name, ''))
    .map((it, i) => ({
      id: asText(it.id, `item_${i}`),
      name: asText(it.name, ''),
      category: asText(it.category, 'essential'),
      icon: asText(it.icon, 'fa-solid fa-box'),
      gradientClass: asText(it.gradientClass, 'grad-sky'),
      packed: !!it.packed,
    }));

  return { items, modules };
}

/**
 * Suma los módulos y objetos de la copia a los actuales.
 * - Un módulo con el mismo título se une al existente (se agregan solo las opciones que falten).
 * - Un objeto con el mismo nombre se omite.
 * - Las categorías de los objetos se ajustan si una opción cambió de id.
 * Todo lo agregado recibe ids nuevos, porque los ids son únicos en toda la base.
 */
export function mergeBackup<I extends BackupItem, M extends BackupModule>(
  current: { items: I[]; modules: M[] },
  backup: { items: I[]; modules: M[] }
): MergeResult<I, M> {
  const stamp = Date.now().toString(36);
  let counter = 0;
  const freshId = (prefix: string) => `${prefix}_${stamp}_${counter++}`;

  const modules: M[] = current.modules.map((m) => ({ ...m, options: [...(m.options || [])] }));
  // Option ids double as item categories, so they must not collide inside the account
  const usedOptionIds = new Set(modules.flatMap((m) => m.options.map((o) => o.id)));
  const optionIdMap: Record<string, string> = {};
  let addedModules = 0;
  let mergedModules = 0;

  const takeOptionId = (id: string) => {
    const finalId = usedOptionIds.has(id) ? freshId('opt') : id;
    usedOptionIds.add(finalId);
    return finalId;
  };

  for (const incoming of backup.modules) {
    if (!incoming || !incoming.title) continue;
    const existing = modules.find((m) => normalize(m.title) === normalize(incoming.title));

    if (existing) {
      let changed = false;
      for (const opt of incoming.options || []) {
        const sameName = existing.options.find((o) => normalize(o.name) === normalize(opt.name));
        if (sameName) {
          optionIdMap[opt.id] = sameName.id;
        } else {
          const newId = takeOptionId(opt.id);
          optionIdMap[opt.id] = newId;
          existing.options.push({ ...opt, id: newId });
          changed = true;
        }
      }
      if (changed) mergedModules++;
    } else {
      const options = (incoming.options || []).map((opt) => {
        const newId = takeOptionId(opt.id);
        optionIdMap[opt.id] = newId;
        return { ...opt, id: newId };
      });
      modules.push({
        ...incoming,
        id: freshId('mod'),
        options,
        selectedOption: optionIdMap[incoming.selectedOption] || options[0]?.id || '',
      });
      addedModules++;
    }
  }

  const items: I[] = [...current.items];
  const existingNames = new Set(items.map((i) => normalize(i.name)));
  let addedItems = 0;
  let skippedItems = 0;

  for (const incoming of backup.items) {
    if (!incoming || !incoming.name) continue;
    if (existingNames.has(normalize(incoming.name))) {
      skippedItems++;
      continue;
    }
    existingNames.add(normalize(incoming.name));
    items.push({
      ...incoming,
      id: freshId('item'),
      category: optionIdMap[incoming.category] || incoming.category,
      packed: false,
    });
    addedItems++;
  }

  return { items, modules, addedItems, skippedItems, addedModules, mergedModules };
}

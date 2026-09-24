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

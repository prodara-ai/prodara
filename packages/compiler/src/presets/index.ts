// ---------------------------------------------------------------------------
// Prodara Compiler — Presets barrel
// ---------------------------------------------------------------------------

export type { PresetManifest, PresetOverrides, InstalledPreset } from './types.js';
export { loadPresets, installPreset, removePreset, mergePresetOverrides, PRESETS_DIR } from './loader.js';

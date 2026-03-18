// ---------------------------------------------------------------------------
// Prodara Compiler — Preset Types
// ---------------------------------------------------------------------------

export interface PresetManifest {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly overrides: PresetOverrides;
}

export interface PresetOverrides {
  readonly templates?: Record<string, string>;
  readonly reviewerConfig?: Record<string, { readonly enabled?: boolean; readonly promptPath?: string | null }>;
  readonly governanceDefaults?: Record<string, unknown>;
  readonly slashCommandOverrides?: Record<string, string>;
}

export interface InstalledPreset {
  readonly manifest: PresetManifest;
  readonly path: string;
  readonly priority: number;
}

// ---------------------------------------------------------------------------
// Prodara Compiler — Extension Types
// ---------------------------------------------------------------------------

import type { NodeKind } from '../types.js';

/** Capability declarations for extensions. */
export type ExtensionCapability =
  | { readonly kind: 'generator'; readonly supportedNodeKinds: readonly NodeKind[]; readonly entryPoint: string }
  | { readonly kind: 'reviewer'; readonly entryPoint: string }
  | { readonly kind: 'pipeline-phase'; readonly after: string; readonly entryPoint: string }
  | { readonly kind: 'command'; readonly name: string; readonly description: string; readonly entryPoint: string }
  | { readonly kind: 'template'; readonly templateId: string; readonly entryPoint: string };

/** Manifest stored in `prodara-extension.json`. */
export interface ExtensionManifest {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly prodara: { readonly minVersion: string };
  readonly capabilities: readonly ExtensionCapability[];
}

/** A locally installed extension. */
export interface InstalledExtension {
  readonly manifest: ExtensionManifest;
  readonly path: string;
  readonly enabled: boolean;
}

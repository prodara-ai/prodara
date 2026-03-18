// ---------------------------------------------------------------------------
// Prodara Templates — Onboard Phase
// ---------------------------------------------------------------------------

import type { OnboardContext } from '../types.js';
import { appendArtifactRules } from './helpers.js';

/** Render the Onboard phase prompt — interactive onboarding guide. */
export function renderOnboard(ctx: OnboardContext): string {
  const lines: string[] = [];

  lines.push('# Prodara Onboarding');
  lines.push('');

  if (ctx.projectState === 'empty') {
    lines.push('## Getting Started');
    lines.push('');
    lines.push('No `.prd` files found. Let\'s create your first product specification.');
    lines.push('');
    lines.push('### Steps');
    lines.push('');
    lines.push('1. Create a product declaration file (e.g. `app.prd`)');
    lines.push('2. Add your first module with entities');
    lines.push('3. Run `prodara build` to compile the product graph');
  } else if (ctx.projectState === 'basic') {
    lines.push('## Expanding Your Specification');
    lines.push('');
    lines.push(`Found ${ctx.prdFileCount} .prd file(s) and ${ctx.modules.length} module(s).`);
    lines.push('');
    lines.push('### Suggested Next Steps');
    lines.push('');
    lines.push('1. Add workflows to model business processes');
    lines.push('2. Add screens/surfaces for UI components');
    lines.push('3. Add governance rules and policies');
    lines.push('4. Run `prodara validate` to check for issues');
  } else {
    lines.push('## Advanced Configuration');
    lines.push('');
    lines.push(`Project has ${ctx.prdFileCount} .prd file(s), ${ctx.modules.length} module(s), and a build artifact.`);
    lines.push('');
    lines.push('### Suggested Next Steps');
    lines.push('');
    lines.push('1. Run `prodara review` to get reviewer feedback');
    lines.push('2. Use `prodara propose <change>` to plan changes');
    lines.push('3. Configure custom reviewers in `.prodara/reviewers/`');
    lines.push('4. Set up a constitution in `.prodara/constitution.md`');
  }

  if (ctx.configuredItems.length > 0) {
    lines.push('');
    lines.push('## Already Configured');
    lines.push('');
    for (const item of ctx.configuredItems) {
      lines.push(`- ✓ ${item}`);
    }
  }

  if (ctx.missingItems.length > 0) {
    lines.push('');
    lines.push('## Not Yet Configured');
    lines.push('');
    for (const item of ctx.missingItems) {
      lines.push(`- ○ ${item}`);
    }
  }

  if (ctx.constitution) {
    lines.push('');
    lines.push('## Constitution');
    lines.push('');
    lines.push(ctx.constitution);
  }

  if (ctx.graphSlice) {
    lines.push('');
    lines.push('## Graph Context');
    lines.push('');
    lines.push(ctx.graphSlice);
  }

  appendArtifactRules(lines, ctx);

  return lines.join('\n');
}

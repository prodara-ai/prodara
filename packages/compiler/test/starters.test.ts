import { describe, it, expect } from 'vitest';
import { getStarterTemplate, listStarterTemplates } from '../src/cli/starters.js';

describe('Starter Templates', () => {
  describe('listStarterTemplates', () => {
    it('returns all available templates', () => {
      const templates = listStarterTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(5);

      const names = templates.map(t => t.name);
      expect(names).toContain('minimal');
      expect(names).toContain('saas');
      expect(names).toContain('marketplace');
      expect(names).toContain('internal-tool');
      expect(names).toContain('api');
    });

    it('each template has description and files', () => {
      for (const tmpl of listStarterTemplates()) {
        expect(tmpl.description.length).toBeGreaterThan(0);
        expect(tmpl.files.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getStarterTemplate', () => {
    it('returns template with product name substituted', () => {
      const tmpl = getStarterTemplate('minimal', 'my_awesome_app');
      expect(tmpl).not.toBeNull();
      const content = tmpl!.files[0]!.content;
      expect(content).toContain('product my_awesome_app');
      expect(content).toContain('My Awesome App');
    });

    it('returns null for unknown template', () => {
      const tmpl = getStarterTemplate('nonexistent', 'test');
      expect(tmpl).toBeNull();
    });

    it('saas template has auth and billing modules', () => {
      const tmpl = getStarterTemplate('saas', 'my_saas');
      expect(tmpl).not.toBeNull();
      const fileNames = tmpl!.files.map(f => f.path);
      expect(fileNames).toContain('auth.prd');
      expect(fileNames).toContain('billing.prd');
    });

    it('marketplace template has users, catalog, orders modules', () => {
      const tmpl = getStarterTemplate('marketplace', 'my_market');
      expect(tmpl).not.toBeNull();
      const fileNames = tmpl!.files.map(f => f.path);
      expect(fileNames).toContain('users.prd');
      expect(fileNames).toContain('catalog.prd');
      expect(fileNames).toContain('orders.prd');
    });

    it('api template has auth and api modules', () => {
      const tmpl = getStarterTemplate('api', 'my_api');
      expect(tmpl).not.toBeNull();
      const fileNames = tmpl!.files.map(f => f.path);
      expect(fileNames).toContain('auth.prd');
      expect(fileNames).toContain('api.prd');
    });
  });
});

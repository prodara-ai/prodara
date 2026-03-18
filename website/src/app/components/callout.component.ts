import { Component, input } from '@angular/core';

@Component({
  selector: 'app-callout',
  template: `
    <div
      class="my-4 rounded-lg border-l-4 p-4"
      [class]="variantClasses[variant()]"
    >
      <div class="flex items-start gap-3">
        <span class="mt-0.5 text-lg" [innerHTML]="icons[variant()]"></span>
        <div class="min-w-0 flex-1 text-sm leading-relaxed">
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class CalloutComponent {
  readonly variant = input<'info' | 'tip' | 'warning' | 'danger'>('info');

  readonly variantClasses: Record<string, string> = {
    info: 'border-primary-500 bg-primary-50 text-primary-900 dark:bg-primary-900/20 dark:text-primary-200',
    tip: 'border-green-500 bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-200',
    warning: 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200',
    danger: 'border-red-500 bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-200',
  };

  readonly icons: Record<string, string> = {
    info: '\u2139\uFE0F',
    tip: '\uD83D\uDCA1',
    warning: '\u26A0\uFE0F',
    danger: '\uD83D\uDED1',
  };
}

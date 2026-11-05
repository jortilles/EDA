/**
 * Runtime polyfill for Angular's `$localize` tagged-template global.
 * The real `@angular/localize/init` polyfill is ESM-only in a way that breaks
 * under this lightweight (non-Karma) test runner, so we stub the same contract:
 * strip the leading `:@@messageId:` metadata block and return the literal text.
 */
(globalThis as any).$localize = (strings: TemplateStringsArray, ...values: any[]): string => {
  const out = strings.reduce((acc, s, i) => acc + s + (values[i] !== undefined ? String(values[i]) : ''), '');
  return out.replace(/^:[^:]*:/, '');
};

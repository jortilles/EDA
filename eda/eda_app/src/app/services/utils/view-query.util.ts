/**
 * Las vistas del modelo se guardan envueltas como `(<SELECT>) as <technical_name>`
 * porque el backend las inserta directamente en el `FROM`.
 *
 * Devuelve solo el SELECT interno para mostrarlo/editarlo en el frontend sin ese
 * envoltorio. No modifica el valor almacenado.
 */
export function unwrapViewQuery(query: string): string {
  if (!query) return '';
  const trimmed = query.trim();
  const match = trimmed.match(/^\(([\s\S]+)\)\s+as\s+[^\s;]+\s*;?\s*$/i);
  return (match ? match[1] : trimmed).trim();
}

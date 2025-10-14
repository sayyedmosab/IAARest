import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'imagePath',
  standalone: true
})
export class ImagePathPipe implements PipeTransform {
  transform(filename?: string, placeholder = '/images/placeholder.png'): string {
    if (!filename) return placeholder;
    const clean = String(filename).replace(/^\/+/, '');
  // Match server-side fallback: return a relative 'images/...' path (no leading slash)
  const resolved = clean ? `images/${clean}` : placeholder;
    try {
      // Client-side debug: print mapping so browser console shows exactly what src will be requested
      // eslint-disable-next-line no-console
      console.debug(`[IMAGE PIPE] filename='${filename}' -> '${resolved}'`);
    } catch (e) {
      // ignore
    }
    return resolved;
  }
}

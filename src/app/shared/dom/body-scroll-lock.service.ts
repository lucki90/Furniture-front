import { DOCUMENT } from '@angular/common';
import { Injectable, Renderer2, RendererFactory2, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BodyScrollLockService {
  private readonly document = inject(DOCUMENT);
  private readonly renderer: Renderer2 = inject(RendererFactory2).createRenderer(null, null);

  private lockCount = 0;
  private previousOverflow: string | null = null;

  lock(): void {
    if (this.lockCount === 0) {
      this.previousOverflow = this.document.body.style.overflow;
      this.renderer.setStyle(this.document.body, 'overflow', 'hidden');
    }

    this.lockCount += 1;
  }

  unlock(): void {
    if (this.lockCount === 0) {
      return;
    }

    this.lockCount -= 1;

    if (this.lockCount > 0) {
      return;
    }

    if (this.previousOverflow === null || this.previousOverflow === '') {
      this.renderer.removeStyle(this.document.body, 'overflow');
    } else {
      this.renderer.setStyle(this.document.body, 'overflow', this.previousOverflow);
    }

    this.previousOverflow = null;
  }
}

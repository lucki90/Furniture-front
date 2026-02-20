import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';
import { ToastData, ToastType } from './api-error.model';

/**
 * Komponent kontenera toastów.
 *
 * Wyświetla powiadomienia toast w prawym górnym rogu ekranu.
 * Wspiera różne typy: error, warning, success, info.
 */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toasts(); track toast.id) {
        <div
          class="toast"
          [class]="'toast--' + toast.type"
          [@toastAnimation]
        >
          <!-- Ikona -->
          <div class="toast__icon">
            @switch (toast.type) {
              @case ('error') { <span>❌</span> }
              @case ('warning') { <span>⚠️</span> }
              @case ('success') { <span>✅</span> }
              @case ('info') { <span>ℹ️</span> }
            }
          </div>

          <!-- Treść -->
          <div class="toast__content">
            @if (toast.title) {
              <div class="toast__title">{{ toast.title }}</div>
            }
            <div class="toast__message">{{ toast.message }}</div>

            <!-- Lista szczegółów (dla wielu błędów) -->
            @if (toast.details && toast.details.length > 0) {
              <ul class="toast__details">
                @for (detail of toast.details; track detail) {
                  <li>{{ detail }}</li>
                }
              </ul>
            }

            <!-- ID błędu (dla supportu) -->
            @if (toast.errorId) {
              <div class="toast__error-id">
                ID: {{ toast.errorId }}
              </div>
            }
          </div>

          <!-- Przycisk zamknięcia -->
          @if (toast.dismissible) {
            <button
              class="toast__close"
              (click)="dismiss(toast.id)"
              title="Zamknij"
            >
              ×
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 420px;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 10px;
      background: white;
      box-shadow:
        0 4px 12px rgba(0, 0, 0, 0.15),
        0 0 0 1px rgba(0, 0, 0, 0.05);
      pointer-events: auto;
      animation: slideIn 0.3s ease-out;
      max-width: 100%;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    /* Typy toastów */
    .toast--error {
      border-left: 4px solid #ef4444;
      background: linear-gradient(135deg, #fef2f2 0%, white 100%);
    }

    .toast--warning {
      border-left: 4px solid #f59e0b;
      background: linear-gradient(135deg, #fffbeb 0%, white 100%);
    }

    .toast--success {
      border-left: 4px solid #10b981;
      background: linear-gradient(135deg, #ecfdf5 0%, white 100%);
    }

    .toast--info {
      border-left: 4px solid #3b82f6;
      background: linear-gradient(135deg, #eff6ff 0%, white 100%);
    }

    /* Ikona */
    .toast__icon {
      flex-shrink: 0;
      font-size: 18px;
      line-height: 1;
      padding-top: 2px;
    }

    /* Treść */
    .toast__content {
      flex: 1;
      min-width: 0;
    }

    .toast__title {
      font-weight: 600;
      font-size: 14px;
      color: #1f2937;
      margin-bottom: 4px;
    }

    .toast__message {
      font-size: 13px;
      color: #4b5563;
      line-height: 1.4;
      word-wrap: break-word;
    }

    /* Lista szczegółów */
    .toast__details {
      margin: 8px 0 0 0;
      padding-left: 16px;
      font-size: 12px;
      color: #6b7280;
      list-style: disc;
    }

    .toast__details li {
      margin-bottom: 4px;
      line-height: 1.4;
    }

    .toast__details li:last-child {
      margin-bottom: 0;
    }

    /* ID błędu */
    .toast__error-id {
      margin-top: 8px;
      font-size: 11px;
      color: #9ca3af;
      font-family: monospace;
      user-select: all;
    }

    /* Przycisk zamknięcia */
    .toast__close {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      font-size: 18px;
      color: #9ca3af;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.15s ease;
      margin: -4px -4px -4px 4px;
    }

    .toast__close:hover {
      background: rgba(0, 0, 0, 0.05);
      color: #6b7280;
    }

    /* Responsywność */
    @media (max-width: 480px) {
      .toast-container {
        left: 8px;
        right: 8px;
        max-width: none;
      }
    }
  `]
})
export class ToastContainerComponent {
  readonly toasts = this.toastService.toasts;

  constructor(private readonly toastService: ToastService) {}

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}

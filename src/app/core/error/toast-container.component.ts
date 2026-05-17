import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="toast-container">
      @for (toast of toasts(); track toast.id) {
        <div class="toast" [class]="'toast toast--' + toast.type">
          <div class="toast__icon" [class]="'toast__icon toast__icon--' + toast.type">
            <mat-icon aria-hidden="true">{{ iconFor(toast.type) }}</mat-icon>
          </div>

          <div class="toast__content">
            @if (toast.title) {
              <div class="toast__title">{{ toast.title }}</div>
            }
            <div class="toast__message">{{ toast.message }}</div>

            @if (toast.details && toast.details.length > 0) {
              <ul class="toast__details">
                @for (detail of toast.details; track detail) {
                  <li>{{ detail }}</li>
                }
              </ul>
            }

            @if (toast.errorId) {
              <div class="toast__error-id">ID: {{ toast.errorId }}</div>
            }
          </div>

          @if (toast.dismissible) {
            <button
              type="button"
              class="toast__close"
              (click)="dismiss(toast.id)"
              title="Zamknij"
              aria-label="Zamknij">
              <mat-icon aria-hidden="true">close</mat-icon>
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

    .toast--error {
      border-left: 4px solid var(--error-color);
      background: linear-gradient(135deg, var(--error-bg) 0%, white 100%);
    }

    .toast--warning {
      border-left: 4px solid var(--warning-color);
      background: linear-gradient(135deg, var(--warning-bg) 0%, white 100%);
    }

    .toast--success {
      border-left: 4px solid var(--success-color);
      background: linear-gradient(135deg, var(--success-bg) 0%, white 100%);
    }

    .toast--info {
      border-left: 4px solid var(--accent-color);
      background: linear-gradient(135deg, var(--info-bg) 0%, white 100%);
    }

    .toast__icon {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      padding-top: 1px;
    }

    .toast__icon mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }

    .toast__icon--error { color: var(--error-color); }
    .toast__icon--warning { color: var(--warning-color); }
    .toast__icon--success { color: var(--success-color); }
    .toast__icon--info { color: var(--accent-color); }

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

    .toast__error-id {
      margin-top: 8px;
      font-size: 11px;
      color: #9ca3af;
      font-family: monospace;
      user-select: all;
    }

    .toast__close {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.15s ease;
      margin: -4px -4px -4px 4px;
      padding: 0;
    }

    .toast__close mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }

    .toast__close:hover {
      background: rgba(0, 0, 0, 0.05);
      color: #6b7280;
    }

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

  iconFor(type: string): string {
    switch (type) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning_amber';
      case 'success':
        return 'check_circle';
      default:
        return 'info';
    }
  }
}

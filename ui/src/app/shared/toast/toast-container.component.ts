// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, computed, inject, signal } from '@angular/core';
import { NgbToast } from '@ng-bootstrap/ng-bootstrap';
import { ToastService, ToastType } from './toast.service';

const ICONS: Record<ToastType, string> = {
    success: 'check-circle-fill',
    error: 'exclamation-octagon-fill',
    info: 'info-circle-fill',
    warning: 'exclamation-triangle-fill',
};

@Component({
    selector: 'xm-toast-container',
    template: `
        @for (position of positions; track position) {
            <div class="xm-toast-container xm-toast-{{ position }}">
                @for (t of byPosition()[position]; track t.id) {
                    <ngb-toast
                        class="xm-toast"
                        [class]="'xm-toast-' + t.type"
                        [autohide]="hovered() !== t.id"
                        [delay]="t.timeOut"
                        (hidden)="Toast.remove(t.id)"
                        (click)="Toast.tap(t.id)"
                        (mouseenter)="hovered.set(t.id)"
                        (mouseleave)="hovered.set(undefined)"
                    >
                        <div class="d-flex gap-3 align-items-center">
                            <i class="bi bi-{{ icons[t.type] }} xm-toast-icon" aria-hidden="true"></i>
                            <div>
                                @if (t.title) {
                                    <div class="fw-bold">{{ t.title }}</div>
                                }
                                <div>{{ t.message }}</div>
                            </div>
                        </div>
                        @if (t.progressBar && hovered() !== t.id) {
                            <div class="xm-toast-progress" [style.animation-duration.ms]="t.timeOut"></div>
                        }
                    </ngb-toast>
                }
            </div>
        }
    `,
    styles: [
        `
            .xm-toast-container {
                position: fixed;
                z-index: 1090;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                @media print {
                    display: none;
                }
            }
            .xm-toast-top-right {
                top: 12px;
                right: 12px;
            }
            .xm-toast-center {
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            /* palette and shape follow ngx-toastr, which this replaced */
            .xm-toast {
                --bs-toast-max-width: 300px;
                --bs-toast-color: #fff;
                --bs-toast-border-width: 0;
                --bs-toast-border-radius: 3px;
                --bs-toast-box-shadow: 0 0 12px #999;
                --bs-toast-padding-x: 0.75rem;
                --bs-toast-padding-y: 0.75rem;
                position: relative;
                overflow: hidden;
                cursor: pointer;
                &:hover {
                    --bs-toast-box-shadow: 0 0 12px #000;
                }
            }
            .xm-toast-success {
                --bs-toast-bg: #51a351;
            }
            .xm-toast-error {
                --bs-toast-bg: #bd362f;
            }
            .xm-toast-info {
                --bs-toast-bg: #2f96b4;
            }
            .xm-toast-warning {
                --bs-toast-bg: #f89406;
            }
            .xm-toast-icon {
                font-size: 1.5rem;
                line-height: 1;
            }
            .xm-toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 4px;
                background-color: #000;
                opacity: 0.4;
                animation-name: xm-toast-countdown;
                animation-timing-function: linear;
                animation-fill-mode: forwards;
            }
            @keyframes xm-toast-countdown {
                from {
                    width: 100%;
                }
                to {
                    width: 0;
                }
            }
        `,
    ],
    imports: [NgbToast],
})
export class ToastContainerComponent {
    readonly Toast = inject(ToastService);

    readonly positions = ['top-right', 'center'] as const;
    readonly icons = ICONS;
    readonly hovered = signal<number | undefined>(undefined);
    readonly byPosition = computed(() => {
        const toasts = this.Toast.toasts();
        return {
            'top-right': toasts.filter((t) => t.position === 'top-right'),
            center: toasts.filter((t) => t.position === 'center'),
        };
    });
}

// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable, computed, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastOptions = {
    timeOut?: number;
    position?: 'top-right' | 'center';
    progressBar?: boolean;
};

export type ToastRef = {
    readonly onTap: Observable<void>;
    readonly onHidden: Observable<void>;
};

export type Toast = {
    readonly id: number;
    readonly type: ToastType;
    readonly message: string;
    readonly title?: string;
    readonly timeOut: number;
    readonly position: 'top-right' | 'center';
    readonly progressBar: boolean;
};

type ActiveToast = { toast: Toast; tap: Subject<void>; hidden: Subject<void>; ref: ToastRef };

@Injectable({ providedIn: 'root' })
export class ToastService {
    readonly toasts = computed(() => this.active().map((a) => a.toast));

    private readonly active = signal<ActiveToast[]>([]);
    private nextId = 0;

    success = (message?: string, title?: string, options?: ToastOptions) =>
        this.show('success', message, title, options);
    error = (message?: string, title?: string, options?: ToastOptions) => this.show('error', message, title, options);
    info = (message?: string, title?: string, options?: ToastOptions) => this.show('info', message, title, options);
    warning = (message?: string, title?: string, options?: ToastOptions) =>
        this.show('warning', message, title, options);

    tap = (id: number) => {
        const active = this.find(id);
        if (active) {
            active.tap.next();
            this.remove(id);
        }
    };

    remove = (id: number) => {
        const active = this.find(id);
        if (active) {
            this.active.update((as) => as.filter((a) => a.toast.id !== id));
            this.complete(active);
        }
    };

    clear = () => {
        const all = this.active();
        this.active.set([]);
        all.forEach(this.complete);
    };

    private show(type: ToastType, message = '', title?: string, options: ToastOptions = {}): ToastRef {
        const duplicate = this.active().find((a) => a.toast.message === message);
        if (duplicate) return duplicate.ref;

        const tap = new Subject<void>();
        const hidden = new Subject<void>();
        const toast: Toast = {
            id: this.nextId++,
            type,
            message,
            title: title || undefined,
            timeOut: options.timeOut ?? 5000,
            position: options.position ?? 'top-right',
            progressBar: options.progressBar ?? false,
        };
        const ref = { onTap: tap.asObservable(), onHidden: hidden.asObservable() };
        this.active.update((as) => [{ toast, tap, hidden, ref }, ...as]); // newest on top
        return ref;
    }

    private find = (id: number) => this.active().find((a) => a.toast.id === id);

    private complete = (active: ActiveToast) => {
        active.tap.complete();
        active.hidden.next();
        active.hidden.complete();
    };
}

// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

declare global {
    interface Window {
        SEB?: {
            getSEBVersion: () => string;
            getSEBConfig: () => string;
            getSEBHash: () => string;
            getSEBConfigKey: () => string;
        };
    }
}

@Injectable({ providedIn: 'root' })
export class SebApiService {
    private sebAvailable = new BehaviorSubject<boolean>(false);
    private sebConfigKey = new BehaviorSubject<string | null>(null);

    constructor() {
        this.checkSebAvailability();
    }

    isSebAvailable(): Observable<boolean> {
        return this.sebAvailable.asObservable();
    }

    getSebVersion(): string | null {
        return window.SEB?.getSEBVersion() || null;
    }

    getSebConfig(): string | null {
        return window.SEB?.getSEBConfig() || null;
    }

    getSebHash(): string | null {
        return window.SEB?.getSEBHash() || null;
    }

    getSebConfigKey(): string | null {
        return window.SEB?.getSEBConfigKey() || null;
    }

    setExpectedConfigKey(key: string): void {
        this.sebConfigKey.next(key);
    }

    getExpectedConfigKey(): Observable<string | null> {
        return this.sebConfigKey.asObservable();
    }

    validateSebConfig(): boolean {
        const expectedKey = this.sebConfigKey.getValue();
        const actualKey = this.getSebConfigKey();

        if (!expectedKey || !actualKey) {
            return false;
        }

        return expectedKey === actualKey;
    }

    private checkSebAvailability(): void {
        const isAvailable = typeof window.SEB !== 'undefined';
        this.sebAvailable.next(isAvailable);
    }
}

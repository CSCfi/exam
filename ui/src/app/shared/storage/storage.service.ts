// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
    get<T>(key: string): T | undefined {
        try {
            const item = sessionStorage.getItem(key);
            if (item === null) {
                return undefined;
            }
            return JSON.parse(item) as T;
        } catch (error) {
            console.warn(`Failed to get item from sessionStorage: ${key}`, error);
            return undefined;
        }
    }

    set<T>(key: string, value: T): void {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Failed to set item in sessionStorage: ${key}`, error);
        }
    }

    remove(key: string): void {
        try {
            sessionStorage.removeItem(key);
        } catch (error) {
            console.error(`Failed to remove item from sessionStorage: ${key}`, error);
        }
    }

    clear(): void {
        try {
            sessionStorage.clear();
        } catch (error) {
            console.error('Failed to clear sessionStorage', error);
        }
    }

    has(key: string): boolean {
        try {
            return sessionStorage.getItem(key) !== null;
        } catch (error) {
            console.warn(`Failed to check for item in sessionStorage: ${key}`, error);
            return false;
        }
    }

    keys(): string[] {
        try {
            return Object.keys(sessionStorage);
        } catch (error) {
            console.warn('Failed to get keys from sessionStorage', error);
            return [];
        }
    }
}

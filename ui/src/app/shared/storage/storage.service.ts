// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
    get = <T>(key: string): T | undefined => {
        const item = sessionStorage.getItem(key);
        if (item === null) {
            return undefined;
        }
        return JSON.parse(item) as T;
    };

    set = <T>(key: string, value: T): void => {
        sessionStorage.setItem(key, JSON.stringify(value));
    };

    remove = (key: string): void => sessionStorage.removeItem(key);

    clear = (): void => sessionStorage.clear();

    has = (key: string): boolean => sessionStorage.getItem(key) !== null;

    keys = (): string[] => Object.keys(sessionStorage);
}

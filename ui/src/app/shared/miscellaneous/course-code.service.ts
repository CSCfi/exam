// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SESSION_STORAGE, WebStorageService } from 'ngx-webstorage-service';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class CourseCodeService {
    private storageService = inject<WebStorageService>(SESSION_STORAGE);
    private http = inject(HttpClient);
    private loadingPrefix = false;

    formatCode = (code: string): string => {
        const prefix = this.storageService.get('COURSE_CODE_PREFIX');
        if (prefix) {
            const parts = code.split(prefix);
            return parts.length > 1 ? parts.slice(0, parts.length - 1).join(prefix) : parts[0];
        } else if (!this.loadingPrefix) {
            // Lazy load prefix if not available and not already loading
            this.loadPrefixLazily();
        }
        return code;
    };

    private loadPrefixLazily = () => {
        this.loadingPrefix = true;
        this.http
            .get<{ prefix: string }>('/app/settings/coursecodeprefix')
            .pipe(
                tap((data) => {
                    this.storageService.set('COURSE_CODE_PREFIX', data.prefix);
                    this.loadingPrefix = false;
                }),
                catchError(() => {
                    // If it fails, continue without prefix (not critical)
                    this.loadingPrefix = false;
                    return of(undefined);
                }),
            )
            .subscribe();
    };
}

// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable, inject } from '@angular/core';
import { StorageService } from 'src/app/shared/storage/storage.service';

@Injectable({ providedIn: 'root' })
export class CourseCodeService {
    private storageService = inject(StorageService);

    formatCode = (code: string): string => {
        const prefix = this.storageService.get<string>('COURSE_CODE_PREFIX');
        if (prefix) {
            const parts = code.split(prefix);
            return parts.length > 1 ? parts.slice(0, parts.length - 1).join(prefix) : parts[0];
        }
        return code;
    };
}

import { Inject, Injectable } from '@angular/core';
import { SESSION_STORAGE, WebStorageService } from 'ngx-webstorage-service';

@Injectable({ providedIn: 'root' })
export class CourseCodeService {
    constructor(@Inject(SESSION_STORAGE) private webStorageService: WebStorageService) {}

    formatCode = (code: string): string => {
        const prefix = this.webStorageService.get('COURSE_CODE_PREFIX');
        if (prefix) {
            const parts = code.split(prefix);
            return parts.length > 1 ? parts.slice(0, parts.length - 1).join(prefix) : parts[0];
        }
        return code;
    };
}

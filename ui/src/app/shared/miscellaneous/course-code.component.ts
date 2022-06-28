import { Component, Inject, Input } from '@angular/core';
import { SESSION_STORAGE, WebStorageService } from 'ngx-webstorage-service';
import type { Course } from '../../exam/exam.model';

@Component({
    selector: 'xm-course-code',
    template: ` <span *ngIf="course.code">{{ formatCode() }}</span> `,
})
export class CourseCodeComponent {
    @Input() course!: Course;
    constructor(@Inject(SESSION_STORAGE) private webStorageService: WebStorageService) {}

    formatCode() {
        const prefix = this.webStorageService.get('COURSE_CODE_PREFIX');
        if (prefix) {
            const parts = this.course.code.split(prefix);
            return parts.slice(0, parts.length - 1).join();
        }
        return this.course.code;
    }
}

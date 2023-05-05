import { Component, Inject, Input } from '@angular/core';
import { SESSION_STORAGE, WebStorageService } from 'ngx-webstorage-service';
import type { Course } from '../../exam/exam.model';
import { CourseCodeService } from './course-code.service';

@Component({
    selector: 'xm-course-code',
    template: ` <span *ngIf="course.code">{{ formatCode() }}</span> `,
})
export class CourseCodeComponent {
    @Input() course!: Course;
    constructor(
        @Inject(SESSION_STORAGE) private webStorageService: WebStorageService,
        private CodeService: CourseCodeService,
    ) {}

    formatCode = () => this.CodeService.formatCode(this.course.code);
}

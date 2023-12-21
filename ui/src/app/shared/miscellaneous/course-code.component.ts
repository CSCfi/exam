import { Component, Input } from '@angular/core';
import type { Course } from '../../exam/exam.model';
import { CourseCodeService } from './course-code.service';

@Component({
    selector: 'xm-course-code',
    template: ` <span *ngIf="course.code">{{ formatCode() }}</span> `,
})
export class CourseCodeComponent {
    @Input() course!: Course;
    constructor(private CodeService: CourseCodeService) {}

    formatCode = () => this.CodeService.formatCode(this.course.code);
}

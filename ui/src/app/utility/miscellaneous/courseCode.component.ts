import { Component, Input } from '@angular/core';

import { Course } from '../../exam/exam.model';

@Component({
    selector: 'course-code',
    template: `
        <span *ngIf="course?.code">{{ course.code.split('_')[0] }}</span>
    `,
})
export class CourseCodeComponent {
    @Input() course: Course;
}

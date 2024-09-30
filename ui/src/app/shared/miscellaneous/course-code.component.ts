// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input } from '@angular/core';
import type { Course } from 'src/app/exam/exam.model';
import { CourseCodeService } from './course-code.service';

@Component({
    selector: 'xm-course-code',
    template: `
        @if (course.code) {
            <span>{{ formatCode() }}</span>
        }
    `,
    standalone: true,
    imports: [],
})
export class CourseCodeComponent {
    @Input() course!: Course;
    constructor(private CodeService: CourseCodeService) {}

    formatCode = () => this.CodeService.formatCode(this.course.code);
}

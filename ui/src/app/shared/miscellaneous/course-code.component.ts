// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { Course } from 'src/app/exam/exam.model';
import { CourseCodeService } from './course-code.service';

@Component({
    selector: 'xm-course-code',
    template: `
        @if (course().code) {
            <span>{{ formatCode() }}</span>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [],
})
export class CourseCodeComponent {
    readonly course = input.required<Course>();

    private readonly CodeService = inject(CourseCodeService);

    formatCode = () => this.CodeService.formatCode(this.course().code || '');
}

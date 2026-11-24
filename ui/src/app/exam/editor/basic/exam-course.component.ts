// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Component, inject, input, output } from '@angular/core';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CoursePickerComponent } from 'src/app/exam/editor/common/course-picker.component';
import type { Course, Exam } from 'src/app/exam/exam.model';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { ToastService } from 'src/app/shared/toast/toast.service';

@Component({
    selector: 'xm-exam-course',
    template: `
        <div class="xm-stack">
            <div class="xm-form-row">
                <span>
                    {{ 'i18n_course' | translate }}
                    <sup
                        popoverTitle="{{ 'i18n_instructions' | translate }}"
                        ngbPopover="{{ 'i18n_select_exam_course_description' | translate }}"
                        triggers="mouseenter:mouseleave"
                    >
                        <img src="/assets/images/icon_tooltip.svg" alt="" placement="top" />
                    </sup>
                </span>
                <xm-course-picker [course]="exam().course" (updated)="setCourse($event)"></xm-course-picker>
            </div>
            <div class="xm-form-row">
                <span>{{ 'i18n_course_scope' | translate }}</span>
                <span>{{ exam().course?.credits }}</span>
            </div>
            <div class="xm-form-row">
                <span>{{ 'i18n_faculty_name' | translate }}</span>
                <span>{{ exam().course?.organisation?.name }}</span>
            </div>
            <div class="xm-form-row" [hidden]="!exam().course?.gradeScale">
                <span>{{ 'i18n_grade_scale' | translate }}</span>
                <span>{{ displayGradeScale() }}</span>
            </div>
        </div>
    `,
    imports: [NgbPopover, CoursePickerComponent, TranslateModule],
})
export class ExamCourseComponent {
    readonly exam = input.required<Exam>();
    readonly updated = output<Course>();

    private readonly http = inject(HttpClient);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastService);
    private readonly Exam = inject(CommonExamService);

    displayGradeScale() {
        const currentExam = this.exam();
        return currentExam.course && currentExam.course.gradeScale
            ? this.Exam.getScaleDisplayName(currentExam.course.gradeScale)
            : null;
    }

    setCourse(course: Course) {
        const currentExam = this.exam();
        this.http.put(`/app/exams/${currentExam.id}/course/${course.id}`, {}).subscribe(() => {
            this.toast.success(this.translate.instant('i18n_exam_associated_with_course'));
            this.updated.emit(course);
        });
    }
}

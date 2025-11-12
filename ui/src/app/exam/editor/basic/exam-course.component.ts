// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { CoursePickerComponent } from 'src/app/exam/editor/common/course-picker.component';
import type { Course, Exam } from 'src/app/exam/exam.model';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';

@Component({
    selector: 'xm-exam-course',
    template: `<div class="row align-items-center">
            <div class="col-md-3 mt-2">
                {{ 'i18n_course' | translate }}
                <sup
                    popoverTitle="{{ 'i18n_instructions' | translate }}"
                    ngbPopover="{{ 'i18n_select_exam_course_description' | translate }}"
                    triggers="mouseenter:mouseleave"
                >
                    <img src="/assets/images/icon_tooltip.svg" alt="" placement="top" />
                </sup>
            </div>
            <div class="col mt-2">
                <xm-course-picker [course]="exam().course" (updated)="setCourse($event)"></xm-course-picker>
            </div>
        </div>
        <!-- Course scope and organization name elements -> 3 rows -->
        <div class="row mt-3">
            <div class="col-md-3 col-md-offset-3">
                {{ 'i18n_course_scope' | translate }}
            </div>
            <div class="col-md-6">
                {{ exam().course?.credits }}
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-md-3 col-md-offset-3">
                {{ 'i18n_faculty_name' | translate }}
            </div>
            <div class="col-md-6">
                {{ exam().course?.organisation?.name }}
            </div>
        </div>
        <div class="row mt-3" [hidden]="!exam().course?.gradeScale">
            <div class="col-md-3 col-md-offset-3">
                {{ 'i18n_grade_scale' | translate }}
            </div>
            <div class="col-md-6">
                {{ displayGradeScale() }}
            </div>
        </div> `,
    imports: [NgbPopover, CoursePickerComponent, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamCourseComponent {
    exam = input.required<Exam>();
    updated = output<Course>();

    private http = inject(HttpClient);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Exam = inject(CommonExamService);

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

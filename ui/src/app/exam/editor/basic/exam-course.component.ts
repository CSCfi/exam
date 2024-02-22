/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { CommonExamService } from '../../../shared/miscellaneous/common-exam.service';
import type { Course, Exam } from '../../exam.model';
import { CoursePickerComponent } from '../common/course-picker.component';

@Component({
    selector: 'xm-exam-course',
    template: `<div class="row align-items-center">
            <div class="col-md-3 mt-2">
                <div class="exam-basic-title">
                    {{ 'i18n_course' | translate }}
                    <sup
                        popoverTitle="{{ 'i18n_instructions' | translate }}"
                        ngbPopover="{{ 'i18n_select_exam_course_description' | translate }}"
                        triggers="mouseenter:mouseleave"
                    >
                        <img src="/assets/images/icon_tooltip.svg" alt="" placement="top" />
                    </sup>
                </div>
            </div>
            <div class="col mt-2">
                <xm-course-picker [course]="exam.course" (updated)="setCourse($event)"></xm-course-picker>
            </div>
        </div>
        <!-- Course scope and organization name elements -> 3 rows -->
        <div class="row mt-3">
            <div class="col-md-3 col-md-offset-3">
                {{ 'i18n_course_scope' | translate }}
            </div>
            <div class="col-md-6">
                {{ exam.course?.credits }}
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-md-3 col-md-offset-3">
                {{ 'i18n_faculty_name' | translate }}
            </div>
            <div class="col-md-6">
                {{ exam.course?.organisation?.name }}
            </div>
        </div>
        <div class="row mt-3" [hidden]="!exam.course?.gradeScale">
            <div class="col-md-3 col-md-offset-3">
                {{ 'i18n_grade_scale' | translate }}
            </div>
            <div class="col-md-6">
                {{ displayGradeScale() }}
            </div>
        </div> `,
    standalone: true,
    imports: [NgbPopover, CoursePickerComponent, TranslateModule],
})
export class ExamCourseComponent {
    @Input() exam!: Exam;
    @Output() updated = new EventEmitter<Course>();

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
        private Exam: CommonExamService,
    ) {}

    displayGradeScale = () =>
        this.exam.course && this.exam.course.gradeScale
            ? this.Exam.getScaleDisplayName(this.exam.course.gradeScale)
            : null;

    setCourse = (course: Course) =>
        this.http.put(`/app/exams/${this.exam.id}/course/${course.id}`, {}).subscribe(() => {
            this.toast.success(this.translate.instant('i18n_exam_associated_with_course'));
            this.exam.course = course;
            this.updated.emit(course);
        });
}

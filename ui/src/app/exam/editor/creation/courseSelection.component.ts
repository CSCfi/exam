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
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import * as toast from 'toastr';

import { SessionService } from '../../../session/session.service';
import { ExamService } from '../../exam.service';

import type { OnInit } from '@angular/core';
import type { Course, Exam } from '../../exam.model';
@Component({
    selector: 'course-selection',
    templateUrl: './courseSelection.component.html',
})
export class CourseSelectionComponent implements OnInit {
    exam!: Exam;

    constructor(
        private translate: TranslateService,
        private state: StateService,
        private http: HttpClient,
        private Exam: ExamService,
        private Session: SessionService,
    ) {}

    ngOnInit() {
        this.http.get<Exam>(`/app/exams/${this.state.params.id}`).subscribe((exam) => (this.exam = exam));
    }

    getExecutionTypeTranslation = () => !this.exam || this.Exam.getExecutionTypeTranslation(this.exam.executionType);

    updateExamName = () =>
        this.Exam.updateExam$(this.exam).subscribe(
            () => toast.info(this.translate.instant('sitnet_exam_saved')),
            (error) => {
                if (error.data) {
                    const msg = error.data.message || error.data;
                    toast.error(this.translate.instant(msg));
                }
            },
        );

    onCourseSelected = (course: Course) =>
        this.http.put(`/app/exams/${this.exam.id}/course/${course.id}`, {}).subscribe(() => {
            toast.success(this.translate.instant('sitnet_exam_associated_with_course'));
            this.exam.course = course;
        });

    cancelNewExam = () =>
        this.http.delete(`/app/exams/${this.exam.id}`).subscribe(() => {
            toast.success(this.translate.instant('sitnet_exam_removed'));
            const state = this.Session.getUser()?.isAdmin ? 'staff.admin' : 'staff.teacher';
            this.state.go(state);
        });

    continueToExam = () => this.state.go('staff.examEditor.basic', { id: this.exam.id });
}

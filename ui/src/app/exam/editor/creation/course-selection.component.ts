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
import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService, UIRouterGlobals } from '@uirouter/core';
import { ToastrService } from 'ngx-toastr';
import { SessionService } from '../../../session/session.service';
import type { Course, Exam } from '../../exam.model';
import { ExamService } from '../../exam.service';

@Component({
    selector: 'course-selection',
    templateUrl: './course-selection.component.html',
})
export class CourseSelectionComponent implements OnInit {
    exam!: Exam;

    constructor(
        private translate: TranslateService,
        private state: StateService,
        private routing: UIRouterGlobals,
        private http: HttpClient,
        private toast: ToastrService,
        private Exam: ExamService,
        private Session: SessionService,
    ) {}

    ngOnInit() {
        this.http.get<Exam>(`/app/exams/${this.routing.params.id}`).subscribe((exam) => (this.exam = exam));
    }

    getExecutionTypeTranslation = () => !this.exam || this.Exam.getExecutionTypeTranslation(this.exam.executionType);

    updateExamName = () =>
        this.Exam.updateExam$(this.exam).subscribe({
            next: () => this.toast.info(this.translate.instant('sitnet_exam_saved')),
            error: (error) => {
                if (error.data) {
                    const msg = error.data.message || error.data;
                    this.toast.error(this.translate.instant(msg));
                }
            },
        });

    onCourseSelected = (course: Course) =>
        this.http.put(`/app/exams/${this.exam.id}/course/${course.id}`, {}).subscribe(() => {
            this.toast.success(this.translate.instant('sitnet_exam_associated_with_course'));
            this.exam.course = course;
        });

    cancelNewExam = () =>
        this.http.delete(`/app/exams/${this.exam.id}`).subscribe(() => {
            this.toast.success(this.translate.instant('sitnet_exam_removed'));
            const state = this.Session.getUser()?.isAdmin ? 'staff.admin' : 'staff.teacher';
            this.state.go(state);
        });

    continueToExam = () => this.state.go('staff.examEditor.basic', { id: this.exam.id });
}

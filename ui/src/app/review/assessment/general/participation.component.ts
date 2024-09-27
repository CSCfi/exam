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
import { DatePipe, LowerCasePipe, NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamParticipation } from 'src/app/exam/exam.model';
import { SessionService } from 'src/app/session/session.service';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';

@Component({
    selector: 'xm-r-participation',
    template: `
        <div class="col-md-2 ">{{ participation.started | date: 'dd.MM.yyyy' }}</div>
        <div class="col-md-4 ">
            <span [ngClass]="participation.exam.state === 'ABORTED' ? 'text-danger' : 'text-success'">
                {{ 'i18n_exam_status_' + participation.exam.state | lowercase | translate }}
            </span>
        </div>
        <div class="col-md-2 general-info-title" [hidden]="hideGrade()">
            {{ 'i18n_grade' | translate }}:&nbsp;&nbsp;&nbsp;<span style="color: #3ca34f">{{ translateGrade() }}</span>
        </div>
        @if (!hideAnswerLink()) {
            <div class="col-md-4 xm-link">
                <a class="pointer" (click)="viewAnswers()">{{ 'i18n_view_answers' | translate }}</a>
            </div>
        }
    `,
    standalone: true,
    imports: [NgClass, LowerCasePipe, DatePipe, TranslateModule],
})
export class ParticipationComponent {
    @Input() participation!: ExamParticipation;
    @Input() collaborative = false;

    constructor(
        private route: ActivatedRoute,
        private Exam: CommonExamService,
        private Session: SessionService,
    ) {}

    viewAnswers = () => {
        const url = this.collaborative
            ? `/staff/assessments/${this.route.snapshot.params.id}/collaborative/${this.participation._id}`
            : `/staff/assessments/${this.participation.exam?.id}`;
        window.open(url, '_blank');
    };

    hideGrade = () => !this.participation.exam?.grade;

    hideAnswerLink = () => {
        const anonymous =
            (this.participation.collaborativeExam && this.participation.collaborativeExam.anonymous) ||
            this.participation.exam?.anonymous;
        return this.participation.exam?.state === 'ABORTED' || (anonymous && !this.Session.getUser().isAdmin);
    };

    translateGrade = () => {
        if (!this.participation.exam?.grade) {
            return;
        }
        return this.Exam.getExamGradeDisplayName(this.participation.exam.grade.name);
    };
}

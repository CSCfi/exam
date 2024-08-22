// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, LowerCasePipe, NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ExamParticipation } from 'src/app/enrolment/enrolment.model';
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

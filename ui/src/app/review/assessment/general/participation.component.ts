// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, LowerCasePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { SessionService } from 'src/app/session/session.service';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';

@Component({
    selector: 'xm-r-participation',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="col-md-2 ">{{ participation().started | date: 'dd.MM.yyyy' }}</div>
        <div class="col-md-4 ">
            <span [ngClass]="participation().exam.state === 'ABORTED' ? 'text-danger' : 'text-success'">
                {{ 'i18n_exam_status_' + participation().exam.state | lowercase | translate }}
            </span>
        </div>
        <div class="col-md-2 general-info-title" [hidden]="hideGrade()">
            {{ 'i18n_grade' | translate }}:&nbsp;&nbsp;&nbsp;<span style="color: #3ca34f">{{ translateGrade() }}</span>
        </div>
        @if (!hideAnswerLink()) {
            <div class="col-md-4 xm-link">
                <button type="button" class="btn btn-link" (click)="viewAnswers()">
                    {{ 'i18n_view_answers' | translate }}
                </button>
            </div>
        }
    `,
    imports: [NgClass, LowerCasePipe, DatePipe, TranslateModule],
})
export class ParticipationComponent {
    participation = input.required<ExamParticipation>();
    collaborative = input(false);

    private route = inject(ActivatedRoute);
    private Exam = inject(CommonExamService);
    private Session = inject(SessionService);

    viewAnswers = () => {
        const participationValue = this.participation();
        const url = this.collaborative()
            ? `/staff/assessments/${this.route.snapshot.params.id}/collaborative/${participationValue._id}`
            : `/staff/assessments/${participationValue.exam?.id}`;
        window.open(url, '_blank');
    };

    hideGrade = () => !this.participation().exam?.grade;

    hideAnswerLink = () => {
        const participationValue = this.participation();
        const anonymous =
            (participationValue.collaborativeExam && participationValue.collaborativeExam.anonymous) ||
            participationValue.exam?.anonymous;
        return participationValue.exam?.state === 'ABORTED' || (anonymous && !this.Session.getUser().isAdmin);
    };

    translateGrade = () => {
        const participationValue = this.participation();
        if (!participationValue.exam?.grade) {
            return;
        }
        return this.Exam.getExamGradeDisplayName(participationValue.exam.grade.name);
    };
}

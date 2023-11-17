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
import { DatePipe, LowerCasePipe, NgIf, NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamParticipation } from '../../../exam/exam.model';
import { SessionService } from '../../../session/session.service';
import { CommonExamService } from '../../../shared/miscellaneous/common-exam.service';

@Component({
    selector: 'xm-r-participation',
    template: `
        <div class="col-md-2 general-info-title">{{ participation.started | date : 'dd.MM.yyyy' }}</div>
        <div class="col-md-4 general-info-content">
            <span [ngStyle]="participation.exam.state === 'ABORTED' ? { color: '#F35D6C' } : { color: '#3CA34F' }">
                {{ 'sitnet_exam_status_' + participation.exam.state | lowercase | translate }}
            </span>
        </div>
        <div class="col-md-2 generail-info-title" [hidden]="hideGrade()">
            {{ 'sitnet_grade' | translate }}:&nbsp;&nbsp;&nbsp;<span style="color: #3ca34f">{{
                translateGrade()
            }}</span>
        </div>
        <div class="col-md-4 general-info-link-bold" *ngIf="!hideAnswerLink()">
            <a class="pointer" (click)="viewAnswers()">{{ 'sitnet_view_answers' | translate }}</a>
        </div>
    `,
    standalone: true,
    imports: [NgStyle, NgIf, LowerCasePipe, DatePipe, TranslateModule],
})
export class ParticipationComponent {
    @Input() participation!: ExamParticipation;
    @Input() collaborative = false;

    constructor(private route: ActivatedRoute, private Exam: CommonExamService, private Session: SessionService) {}

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

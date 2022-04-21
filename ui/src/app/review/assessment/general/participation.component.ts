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
import { Component, Input } from '@angular/core';
import { UIRouterGlobals } from '@uirouter/core';
import type { ExamParticipation } from '../../../exam/exam.model';
import { SessionService } from '../../../session/session.service';
import { CommonExamService } from '../../../shared/miscellaneous/common-exam.service';
import { WindowRef } from '../../../shared/window/window.service';

@Component({
    selector: 'r-participation',
    template: `<div class="detail-row">
            <div class="col-md-12 general-info-title">{{ participation.started | date: 'dd.MM.yyyy' }}</div>
        </div>
        <div class="detail-row mb-2">
            <div class="col-md-auto">
                <span [ngStyle]="participation.exam.state === 'ABORTED' ? { color: '#F35D6C' } : { color: '#3CA34F' }">
                    {{ 'sitnet_exam_status_' + participation.exam.state | lowercase | translate }}
                </span>
            </div>
            <div class="col-md-auto sitnet-info-text-compact" [hidden]="hideGrade()">
                {{ 'sitnet_grade' | translate }}:&nbsp;&nbsp;&nbsp;<span style="color: #3ca34f">{{
                    translateGrade()
                }}</span>
            </div>
            <div class="col-md-auto general-info-link-bold" *ngIf="!hideAnswerLink()">
                <a class="pointer" (click)="viewAnswers()">{{ 'sitnet_view_answers' | translate }}</a>
            </div>
        </div> `,
})
export class ParticipationComponent {
    @Input() participation!: ExamParticipation;
    @Input() collaborative = false;

    constructor(
        private state: UIRouterGlobals,
        private Exam: CommonExamService,
        private Session: SessionService,
        private Window: WindowRef,
    ) {}

    viewAnswers = () => {
        const url = this.collaborative
            ? `/assessments/collaborative/${this.state.params.id}/${this.participation._id}`
            : `/assessments/${this.participation.exam?.id}`;
        this.Window.nativeWindow.open(url, '_blank');
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

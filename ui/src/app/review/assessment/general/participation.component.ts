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

import { isParticipation } from '../../../exam/exam.model';
import { SessionService } from '../../../session/session.service';
import { CommonExamService } from '../../../utility/miscellaneous/commonExam.service';
import { WindowRef } from '../../../utility/window/window.service';

import type { ExamEnrolment } from '../../../enrolment/enrolment.model';
import type { ExamParticipation } from '../../../exam/exam.model';

@Component({
    selector: 'r-participation',
    templateUrl: './participation.component.html',
})
export class ParticipationComponent {
    @Input() participation!: ExamEnrolment | ExamParticipation;
    @Input() collaborative = false;

    constructor(
        private state: UIRouterGlobals,
        private Exam: CommonExamService,
        private Session: SessionService,
        private Window: WindowRef,
    ) {}

    started = '';

    ngOnInit() {
        if (isParticipation(this.participation)) {
            this.started = this.participation.started;
        } else {
            this.started = this.participation.examinationEventConfiguration
                ? this.participation.examinationEventConfiguration.examinationEvent.start
                : this.participation.reservation?.startAt || '';
        }
    }

    viewAnswers = () => {
        const url = this.collaborative
            ? `/assessments/collaborative/${this.state.params.id}/${(this.participation as ExamParticipation)._id}`
            : `/assessments/${this.participation.exam?.id}`;
        this.Window.nativeWindow.open(url, '_blank');
    };

    hideGrade = () => this.participation?.reservation?.noShow || !this.participation.exam?.grade;

    hideAnswerLink = () => {
        const anonymous =
            (this.participation.collaborativeExam && this.participation.collaborativeExam.anonymous) ||
            this.participation.exam?.anonymous;
        return (
            this.participation.exam?.state === 'ABORTED' ||
            this.participation?.reservation?.noShow ||
            (anonymous && !this.Session.getUser().isAdmin)
        );
    };

    translateGrade = () => {
        if (!this.participation.exam?.grade) {
            return;
        }
        return this.Exam.getExamGradeDisplayName(this.participation.exam.grade.name);
    };
}

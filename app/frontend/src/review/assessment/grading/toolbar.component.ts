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
import { Location } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import * as toast from 'toastr';

import { ExamParticipation } from '../../../exam/exam.model';
import { ExamService } from '../../../exam/exam.service';
import { Examination } from '../../../examination/examination.service';
import { AssessmentService } from '../assessment.service';
import { CollaborativeAssesmentService } from '../collaborativeAssessment.service';

@Component({
    selector: 'r-toolbar',
    template: require('./toolbar.component.html'),
})
export class ToolbarComponent {
    @Input() valid: boolean;
    @Input() participation: ExamParticipation;
    @Input() collaborative: boolean;
    @Input() exam: Examination;

    constructor(
        private state: StateService,
        private location: Location,
        private translate: TranslateService,
        private Assessment: AssessmentService,
        private CollaborativeAssessment: CollaborativeAssesmentService,
        private Exam: ExamService,
    ) {}

    isOwnerOrAdmin = () => this.Exam.isOwnerOrAdmin(this.exam, this.collaborative);
    isReadOnly = () => this.Assessment.isReadOnly(this.exam);
    isGraded = () => this.Assessment.isGraded(this.exam);
    isMaturityRejection = () =>
        this.exam.executionType.type === 'MATURITY' &&
        !this.exam.subjectToLanguageInspection &&
        this.exam.grade &&
        this.exam.grade.marksRejection;

    saveAssessment = () => {
        if (this.collaborative) {
            this.CollaborativeAssessment.saveAssessment(
                this.participation,
                this.isOwnerOrAdmin(),
                this.state.params.id,
                this.state.params.ref,
            );
        } else {
            this.Assessment.saveAssessment(this.exam, this.isOwnerOrAdmin());
        }
    };

    createExamRecord = () => {
        if (this.collaborative) {
            this.CollaborativeAssessment.createExamRecord(
                this.participation,
                this.state.params.id,
                this.state.params.ref,
            );
        } else {
            this.Assessment.createExamRecord$(this.exam, true).subscribe(() => {
                toast.info(this.translate.instant('sitnet_review_recorded'));
                this.location.go(this.getExitUrl());
            });
        }
    };

    rejectMaturity = () =>
        this.Assessment.rejectMaturity$(this.exam).subscribe(() => {
            toast.info(this.translate.instant('sitnet_maturity_rejected'));
            this.location.go(this.getExitUrl());
        });

    getExitUrl = () => this.Assessment.getExitUrl(this.exam, this.collaborative);
}

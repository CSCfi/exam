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
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';

import { ExamService } from '../../../exam/exam.service';
import { AttachmentService } from '../../../utility/attachment/attachment.service';
import { LanguageService } from '../../../utility/language/language.service';
import { CommonExamService } from '../../../utility/miscellaneous/commonExam.service';
import { AssessmentService } from '../assessment.service';
import { GradingBaseComponent } from '../common/gradingBase.component';

import type { Exam } from '../../../exam/exam.model';
import type { User } from '../../../session/session.service';
@Component({
    selector: 'r-maturity-grading',
    templateUrl: './grading.component.html',
})
export class MaturityGradingComponent extends GradingBaseComponent {
    @Input() exam!: Exam;
    @Input() user!: User;
    @Input() questionSummary: unknown;
    @Output() onUpdate = new EventEmitter<void>();

    message: { text?: string } = {};

    constructor(
        private translate: TranslateService,
        http: HttpClient,
        Assessment: AssessmentService,
        Exam: ExamService,
        CommonExam: CommonExamService,
        private Attachment: AttachmentService,
        Language: LanguageService,
    ) {
        super(http, Assessment, Exam, CommonExam, Language);
    }

    ngOnInit() {
        this.initGrade();
        this.initCreditTypes();
        this.initLanguages();

        this.translate.onLangChange.subscribe(() => {
            this.initCreditTypes();
            this.grades.forEach((g) => (g.name = this.CommonExam.getExamGradeDisplayName(g.type)));
        });
    }

    getExam = () => this.exam;

    isUnderLanguageInspection = () =>
        this.user.isLanguageInspector && this.exam.languageInspection && !this.exam.languageInspection.finishedAt;
    hasGoneThroughLanguageInspection = () => this.exam.languageInspection && this.exam.languageInspection.finishedAt;
    isAwaitingInspection = () => this.exam.languageInspection && !this.exam.languageInspection.finishedAt;
    canFinalizeInspection = () => this.exam.languageInspection?.statement.comment;
    isReadOnly = () => this.Assessment.isReadOnly(this.exam);
    isOwnerOrAdmin = () => this.Exam.isOwnerOrAdmin(this.exam);
    downloadFeedbackAttachment = () => this.Attachment.downloadFeedbackAttachment(this.exam);
    downloadStatementAttachment = () => this.Attachment.downloadStatementAttachment(this.exam);
    getExamMaxPossibleScore = () => this.Exam.getMaxScore(this.exam);
    inspectionDone = () => this.onUpdate.emit();
    isGraded = () => this.Assessment.isGraded(this.exam);
    isMaturityRejection = () =>
        this.exam.executionType.type === 'MATURITY' &&
        !this.exam.subjectToLanguageInspection &&
        this.exam.grade &&
        this.exam.grade.marksRejection;

    sendEmailMessage = () => {
        if (!this.message.text) {
            toast.error(this.translate.instant('sitnet_email_empty'));
            return;
        }
        this.http.post(`/app/email/inspection/${this.exam.id}`, { msg: this.message.text }).subscribe(() => {
            toast.info(this.translate.instant('sitnet_email_sent'));
            delete this.message.text;
        }, toast.error);
    };
}

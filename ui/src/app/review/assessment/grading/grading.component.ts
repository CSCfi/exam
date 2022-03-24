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
import { StateService } from '@uirouter/core';
import * as toast from 'toastr';

import { ExamService } from '../../../exam/exam.service';
import { AttachmentService } from '../../../utility/attachment/attachment.service';
import { LanguageService } from '../../../utility/language/language.service';
import { CommonExamService } from '../../../utility/miscellaneous/commonExam.service';
import { AssessmentService } from '../assessment.service';
import { CollaborativeAssesmentService } from '../collaborativeAssessment.service';
import { GradingBaseComponent } from '../common/gradingBase.component';

import type { QuestionAmounts } from '../../../question/question.service';
import type { Examination } from '../../../examination/examination.model';
import type { User } from '../../../session/session.service';
import type { OnInit } from '@angular/core';
import type { Exam, ExamLanguage, ExamParticipation, ExamType, SelectableGrade } from '../../../exam/exam.model';
@Component({
    selector: 'r-grading',
    templateUrl: './grading.component.html',
})
export class GradingComponent extends GradingBaseComponent implements OnInit {
    @Input() exam!: Examination;
    @Input() questionSummary: QuestionAmounts = { accepted: 0, rejected: 0, hasEssays: false };
    @Input() participation!: ExamParticipation;
    @Input() collaborative = false;
    @Input() user!: User;
    @Output() onUpdate = new EventEmitter<void>();

    message: { text?: string } = { text: '' };
    override selections: { grade: SelectableGrade | null; type: ExamType | null; language: ExamLanguage | null } = {
        grade: null,
        type: null,
        language: null,
    };
    override grades: SelectableGrade[] = [];
    override creditTypes: (ExamType & { name: string })[] = [];
    override languages: (ExamLanguage & { name: string })[] = [];

    constructor(
        private translate: TranslateService,
        private state: StateService,
        http: HttpClient,
        Assessment: AssessmentService,
        private CollaborativeAssessment: CollaborativeAssesmentService,
        Exam: ExamService,
        CommonExam: CommonExamService,
        private Attachment: AttachmentService,
        Language: LanguageService,
    ) {
        super(http, Assessment, Exam, CommonExam, Language);
    }

    getExam = () => this.exam;

    ngOnInit() {
        this.initGrade();
        this.initCreditTypes();
        this.initLanguages();

        this.translate.onLangChange.subscribe(() => {
            this.initCreditTypes();
            this.grades.forEach((g) => (g.name = this.CommonExam.getExamGradeDisplayName(g.type)));
        });
    }

    getExamMaxPossibleScore = () => this.Exam.getMaxScore(this.exam);
    getExamTotalScore = () => this.Exam.getTotalScore(this.exam);
    inspectionDone = () => this.onUpdate.emit();
    isOwnerOrAdmin = () => this.Exam.isOwnerOrAdmin(this.exam, this.collaborative);
    isReadOnly = () => this.Assessment.isReadOnly(this.exam);
    isGraded = () => this.Assessment.isGraded(this.exam);

    getTeacherCount = () => {
        // Do not add up if user exists in both groups
        const examOwners = this.collaborative ? this.exam.examOwners : (this.exam.parent as Exam).examOwners;
        const owners = examOwners.filter(
            (owner) => this.exam.examInspections.map((inspection) => inspection.user?.id).indexOf(owner.id) === -1,
        );
        return this.exam.examInspections.length + owners.length;
    };

    sendEmailMessage = () => {
        if (!this.message.text) {
            toast.error(this.translate.instant('sitnet_email_empty'));
            return;
        }
        if (this.collaborative) {
            this.CollaborativeAssessment.sendEmailMessage$(
                this.state.params.id,
                this.state.params.ref,
                this.message.text,
            ).subscribe(
                () => {
                    delete this.message.text;
                    toast.info(this.translate.instant('sitnet_email_sent'));
                },
                (err) => toast.error(err.data),
            );
        } else {
            this.http.post(`/app/email/inspection/${this.exam.id}`, { msg: this.message.text }).subscribe(() => {
                toast.info(this.translate.instant('sitnet_email_sent'));
                delete this.message.text;
            }, toast.error);
        }
    };

    saveAssessmentInfo = () => {
        if (this.collaborative) {
            this.CollaborativeAssessment.saveAssessmentInfo$(
                this.state.params.id,
                this.state.params.ref,
                this.participation,
            ).subscribe();
        } else {
            this.Assessment.saveAssessmentInfo$(this.exam).subscribe();
        }
    };

    downloadFeedbackAttachment = () => {
        const attachment = this.exam.examFeedback?.attachment;
        if (this.collaborative && attachment && attachment.externalId) {
            this.Attachment.downloadCollaborativeAttachment(attachment.externalId, attachment.fileName);
        } else {
            this.Attachment.downloadFeedbackAttachment(this.exam);
        }
    };

    isCommentRead = () => this.Assessment.isCommentRead(this.exam);
}

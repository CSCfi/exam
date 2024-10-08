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
import { NgClass, UpperCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Exam } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { GradingBaseComponent } from 'src/app/review/assessment/common/grading-base.component';
import type { User } from 'src/app/session/session.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { LanguageService } from 'src/app/shared/language/language.service';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { InspectionCommentsComponent } from './inspection-comments.component';
import { MaturityToolbarComponent } from './toolbar.component';

@Component({
    selector: 'xm-r-maturity-grading',
    templateUrl: './grading.component.html',
    styleUrls: ['../assessment.shared.scss'],
    standalone: true,
    imports: [
        NgClass,
        InspectionCommentsComponent,
        MathJaxDirective,
        FormsModule,
        NgbPopover,
        MaturityToolbarComponent,
        UpperCasePipe,
        TranslateModule,
    ],
})
export class MaturityGradingComponent extends GradingBaseComponent implements OnInit {
    @Input() exam!: Exam;
    @Input() user!: User;
    @Input() questionSummary: unknown;
    @Output() updated = new EventEmitter<void>();

    message: { text?: string } = {};

    constructor(
        private translate: TranslateService,
        http: HttpClient,
        toast: ToastrService,
        Assessment: AssessmentService,
        Exam: ExamService,
        CommonExam: CommonExamService,
        private Attachment: AttachmentService,
        Language: LanguageService,
    ) {
        super(http, toast, Assessment, Exam, CommonExam, Language);
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
    inspectionDone = () => this.updated.emit();
    isGraded = () => this.Assessment.isGraded(this.exam);
    isMaturityRejection = () =>
        this.exam.executionType.type === 'MATURITY' &&
        !this.exam.subjectToLanguageInspection &&
        this.exam.grade &&
        this.exam.grade.marksRejection;

    sendEmailMessage = () => {
        if (!this.message.text) {
            this.toast.error(this.translate.instant('i18n_email_empty'));
            return;
        }
        this.http.post(`/app/email/inspection/${this.exam.id}`, { msg: this.message.text }).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('i18n_email_sent'));
                delete this.message.text;
            },
            error: (err) => this.toast.error(err),
        });
    };
}

// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, LowerCasePipe, NgClass, UpperCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import type { Exam, ExamLanguage, ExamType, SelectableGrade } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import type { Examination } from 'src/app/examination/examination.model';
import type { QuestionAmounts } from 'src/app/question/question.model';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { CollaborativeAssesmentService } from 'src/app/review/assessment/collaborative-assessment.service';
import { GradingBaseComponent } from 'src/app/review/assessment/common/grading-base.component';
import type { User } from 'src/app/session/session.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { LanguageService } from 'src/app/shared/language/language.service';
import { MathJaxDirective } from 'src/app/shared/math/mathjax.directive';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { InspectionComponent } from './inspection.component';
import { ToolbarComponent } from './toolbar.component';

@Component({
    selector: 'xm-r-grading',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './grading.component.html',
    styleUrls: ['../assessment.shared.scss'],
    imports: [
        InspectionComponent,
        NgbPopover,
        FormsModule,
        NgClass,
        MathJaxDirective,
        ToolbarComponent,
        UpperCasePipe,
        LowerCasePipe,
        DatePipe,
        TranslateModule,
    ],
})
export class GradingComponent extends GradingBaseComponent implements OnInit {
    exam = input.required<Examination>();
    questionSummary = input<QuestionAmounts>({ accepted: 0, rejected: 0, hasEssays: false });
    participation = input.required<ExamParticipation>();
    collaborative = input(false);
    user = input.required<User>();
    updated = output<void>();

    message: { text?: string } = { text: '' };
    id = 0;
    ref = '';
    override selections: { grade: SelectableGrade | null; type: ExamType | null; language: ExamLanguage | null } = {
        grade: null,
        type: null,
        language: null,
    };
    override grades: SelectableGrade[] = [];
    override creditTypes: (ExamType & { name: string })[] = [];
    override languages: (ExamLanguage & { name: string })[] = [];

    private route = inject(ActivatedRoute);
    private translate = inject(TranslateService);
    private CollaborativeAssessment = inject(CollaborativeAssesmentService);
    private Attachment = inject(AttachmentService);

    constructor() {
        const http = inject(HttpClient);
        const toast = inject(ToastrService);
        const Assessment = inject(AssessmentService);
        const Exam = inject(ExamService);
        const CommonExam = inject(CommonExamService);
        const Language = inject(LanguageService);

        super(http, toast, Assessment, Exam, CommonExam, Language);
    }

    getExam = () => this.exam();

    ngOnInit() {
        this.id = this.route.snapshot.params.id;
        this.ref = this.route.snapshot.params.ref;
        this.initGrades(false, this.collaborative());
        this.initCreditTypes();
        this.initLanguages();

        this.translate.onLangChange.subscribe(() => {
            this.initCreditTypes();
            this.grades.forEach((g) => (g.name = this.CommonExam.getExamGradeDisplayName(g.type)));
        });
    }

    getExamMaxPossibleScore = () => this.Exam.getMaxScore(this.exam());
    getExamTotalScore = () => this.Exam.getTotalScore(this.exam());
    inspectionDone = () => this.updated.emit();
    isOwnerOrAdmin = () => this.Exam.isOwnerOrAdmin(this.exam(), this.collaborative());
    isReadOnly = () => this.Assessment.isReadOnly(this.exam());
    isGraded = () => this.Assessment.isGraded(this.exam());

    getTeacherCount = () => {
        const examValue = this.exam();
        // Do not add up if user exists in both groups
        const examOwners = this.collaborative() ? examValue.examOwners : (examValue.parent as Exam).examOwners;
        const owners = examOwners.filter(
            (owner) => examValue.examInspections.map((inspection) => inspection.user?.id).indexOf(owner.id) === -1,
        );
        return examValue.examInspections.length + owners.length;
    };

    sendEmailMessage = () => {
        if (!this.message.text) {
            this.toast.error(this.translate.instant('i18n_email_empty'));
            return;
        }
        const examValue = this.exam();
        if (this.collaborative()) {
            this.CollaborativeAssessment.sendEmailMessage$(this.id, this.ref, this.message.text).subscribe({
                next: () => {
                    delete this.message.text;
                    this.toast.info(this.translate.instant('i18n_email_sent'));
                },
                error: (err) => this.toast.error(err),
            });
        } else {
            this.http.post(`/app/email/inspection/${examValue.id}`, { msg: this.message.text }).subscribe({
                next: () => {
                    this.toast.info(this.translate.instant('i18n_email_sent'));
                    delete this.message.text;
                },
                error: (err) => this.toast.error(err),
            });
        }
    };

    saveAssessmentInfo = () => {
        if (this.collaborative()) {
            this.CollaborativeAssessment.saveAssessmentInfo$(this.id, this.ref, this.participation()).subscribe();
        } else {
            this.Assessment.saveAssessmentInfo$(this.exam()).subscribe();
        }
    };

    downloadFeedbackAttachment = () => {
        const examValue = this.exam();
        const attachment = examValue.examFeedback?.attachment;
        if (this.collaborative() && attachment && attachment.externalId) {
            this.Attachment.downloadCollaborativeAttachment(attachment.externalId, attachment.fileName);
        } else {
            this.Attachment.downloadFeedbackAttachment(examValue);
        }
    };

    isCommentRead = () => this.Assessment.isCommentRead(this.exam());
}

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
import type { OnInit } from '@angular/core';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Exam, ExamLanguage, ExamParticipation, ExamType, SelectableGrade } from '../../../exam/exam.model';
import { ExamService } from '../../../exam/exam.service';
import type { Examination } from '../../../examination/examination.model';
import type { QuestionAmounts } from '../../../question/question.service';
import type { User } from '../../../session/session.service';
import { AttachmentService } from '../../../shared/attachment/attachment.service';
import { LanguageService } from '../../../shared/language/language.service';
import { CommonExamService } from '../../../shared/miscellaneous/common-exam.service';
import { AssessmentService } from '../assessment.service';
import { CollaborativeAssesmentService } from '../collaborative-assessment.service';
import { GradingBaseComponent } from '../common/grading-base.component';

@Component({
    selector: 'xm-r-grading',
    templateUrl: './grading.component.html',
})
export class GradingComponent extends GradingBaseComponent implements OnInit {
    @Input() exam!: Examination;
    @Input() questionSummary: QuestionAmounts = { accepted: 0, rejected: 0, hasEssays: false };
    @Input() participation!: ExamParticipation;
    @Input() collaborative = false;
    @Input() user!: User;
    @Output() updated = new EventEmitter<void>();

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

    constructor(
        private route: ActivatedRoute,
        http: HttpClient,
        private translate: TranslateService,
        toast: ToastrService,
        Assessment: AssessmentService,
        private CollaborativeAssessment: CollaborativeAssesmentService,
        Exam: ExamService,
        CommonExam: CommonExamService,
        private Attachment: AttachmentService,
        Language: LanguageService,
    ) {
        super(http, toast, Assessment, Exam, CommonExam, Language);
    }

    getExam = () => this.exam;

    ngOnInit() {
        this.id = this.route.snapshot.params.id;
        this.ref = this.route.snapshot.params.ref;
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
    inspectionDone = () => this.updated.emit();
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
            this.toast.error(this.translate.instant('sitnet_email_empty'));
            return;
        }
        if (this.collaborative) {
            this.CollaborativeAssessment.sendEmailMessage$(this.id, this.ref, this.message.text).subscribe({
                next: () => {
                    delete this.message.text;
                    this.toast.info(this.translate.instant('sitnet_email_sent'));
                },
                error: (err) => this.toast.error(err),
            });
        } else {
            this.http.post(`/app/email/inspection/${this.exam.id}`, { msg: this.message.text }).subscribe({
                next: () => {
                    this.toast.info(this.translate.instant('sitnet_email_sent'));
                    delete this.message.text;
                },
                error: (err) => this.toast.error(err),
            });
        }
    };

    saveAssessmentInfo = () => {
        if (this.collaborative) {
            this.CollaborativeAssessment.saveAssessmentInfo$(this.id, this.ref, this.participation).subscribe();
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

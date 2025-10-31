// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import {
    NgbCollapse,
    NgbDropdown,
    NgbDropdownItem,
    NgbDropdownMenu,
    NgbDropdownToggle,
    NgbPopover,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import type { ExamSection } from 'src/app/exam/exam.model';
import { BaseQuestionEditorComponent } from 'src/app/question/examquestion/base-question-editor.component';
import { ExamQuestionDialogComponent } from 'src/app/question/examquestion/exam-question-dialog.component';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import { ExamSectionQuestion, ExamSectionQuestionOption, Question } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';
import { Attachment } from 'src/app/shared/attachment/attachment.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { FileService } from 'src/app/shared/file/file.service';
import { MathJaxDirective } from 'src/app/shared/math/mathjax.directive';
import { mergeDeepRight } from 'src/app/shared/miscellaneous/helpers';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

@Component({
    selector: 'xm-section-question',
    templateUrl: './section-question.component.html',
    imports: [
        CdkDragHandle,
        NgbPopover,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        NgbDropdownItem,
        MathJaxDirective,
        NgbCollapse,
        TranslateModule,
        OrderByPipe,
    ],
})
export class SectionQuestionComponent {
    @Input() sectionQuestion!: ExamSectionQuestion;
    @Input() lotteryOn = false;
    @Input() collaborative = false;
    @Input() section!: ExamSection;
    @Input() examId = 0;
    @Output() removed = new EventEmitter<ExamSectionQuestion>();
    @Output() updated = new EventEmitter<ExamSectionQuestion>();
    @Output() copied = new EventEmitter<ExamSectionQuestion>();

    private http = inject(HttpClient);
    private modal = inject(ModalService);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Confirmation = inject(ConfirmationDialogService);
    private Question = inject(QuestionService);
    private QuestionScore = inject(QuestionScoringService);
    private Attachment = inject(AttachmentService);
    private Files = inject(FileService);

    calculateWeightedMaxPoints = () => this.QuestionScore.calculateWeightedMaxPoints(this.sectionQuestion);
    calculateWeightedMinPoints = () => this.QuestionScore.calculateWeightedMinPoints(this.sectionQuestion);
    getCorrectClaimChoiceOptionScore = () => this.QuestionScore.getCorrectClaimChoiceOptionScore(this.sectionQuestion);

    getMinimumOptionScore = () => this.QuestionScore.getMinimumOptionScore(this.sectionQuestion);

    editQuestion = () => this.openExamQuestionEditor();

    downloadQuestionAttachment = () => {
        if (this.collaborative) {
            this.Attachment.downloadCollaborativeQuestionAttachment(this.examId, this.sectionQuestion);
        }
        this.Attachment.downloadQuestionAttachment(this.sectionQuestion.question);
    };

    removeQuestion = () =>
        this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_remove_question'),
        ).subscribe({ next: () => this.removed.emit(this.sectionQuestion) });

    copyQuestion = () =>
        this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_copy_question'),
        ).subscribe({ next: () => this.copied.emit(this.sectionQuestion) });

    determineClaimOptionType(examOption: ExamSectionQuestionOption) {
        return this.Question.determineClaimOptionTypeForExamQuestionOption(examOption);
    }

    private getQuestionDistribution$(): Observable<boolean> {
        if (this.collaborative) {
            return of(false);
        }
        return this.Question.getQuestionDistribution$(this.sectionQuestion.id);
    }

    private openExamQuestionEditor = () =>
        this.getQuestionDistribution$().subscribe((distributed) => {
            if (!distributed) {
                // If this is not distributed, treat it as a plain question (or at least trick the user to
                // believe so)
                this.openBaseQuestionEditor();
            } else {
                this.openDistributedQuestionEditor();
            }
        });

    private getResource = (url: string) => (this.collaborative ? url.replace('/app/exams/', '/app/iop/exams/') : url);

    private openBaseQuestionEditor = () => {
        const modal = this.modal.openRef(BaseQuestionEditorComponent, {
            windowClass: 'xm-xxl-modal',
            size: 'xl',
        });
        modal.componentInstance.isPopup = true;
        modal.componentInstance.lotteryOn = this.lotteryOn;
        modal.componentInstance.questionDraft = { ...this.sectionQuestion.question, examSectionQuestions: [] };
        modal.componentInstance.collaborative = this.collaborative;
        modal.componentInstance.examId = this.examId;
        modal.componentInstance.sectionQuestion = this.sectionQuestion;
        modal.componentInstance.questionId = this.sectionQuestion.question.id || 0;

        this.modal
            .result$<Question>(modal)
            .pipe(
                switchMap((question: Question) => {
                    const resource = `/app/exams/${this.examId}/sections/${this.section.id}/questions/${this.sectionQuestion.id}`;
                    return this.http
                        .put<ExamSectionQuestion>(this.getResource(resource), {
                            question: question,
                        })
                        .pipe(map((resp) => ({ resp, question })));
                }),
                tap(({ resp }) => {
                    this.sectionQuestion = mergeDeepRight(this.sectionQuestion, resp) as ExamSectionQuestion;
                    this.updated.emit(this.sectionQuestion);
                }),
                switchMap(({ question }) => {
                    if (!this.collaborative) {
                        return of(undefined);
                    }
                    const attachment = question.attachment;
                    if (!attachment) {
                        return of(undefined);
                    }
                    if (attachment.modified && attachment.file) {
                        return this.Files.upload$<Attachment>('/app/iop/collab/attachment/question', attachment.file, {
                            examId: this.examId.toString(),
                            questionId: this.sectionQuestion.id.toString(),
                        });
                    } else if (attachment.removed) {
                        this.Attachment.eraseCollaborativeQuestionAttachment$(
                            this.examId,
                            this.sectionQuestion.id,
                        ).subscribe(() => {
                            delete this.sectionQuestion.question.attachment;
                        });
                    }
                    return of(undefined);
                }),
            )
            .subscribe({
                next: (resp) => {
                    if (resp) {
                        this.sectionQuestion.question.attachment = resp;
                    }
                },
                error: (err) => this.toast.error(err),
            });
    };

    private openDistributedQuestionEditor = () => {
        const modal = this.modal.openRef(ExamQuestionDialogComponent, {
            windowClass: 'xm-xxl-modal',
            size: 'xl',
        });
        modal.componentInstance.examQuestion = { ...this.sectionQuestion };
        modal.componentInstance.lotteryOn = this.lotteryOn;
        this.modal.result$<{ question: Question; examQuestion: ExamSectionQuestion }>(modal).subscribe((data) =>
            this.Question.updateDistributedExamQuestion$(
                data.question,
                data.examQuestion,
                this.examId,
                this.section.id,
            ).subscribe({
                next: (esq: ExamSectionQuestion) => {
                    this.toast.info(this.translate.instant('i18n_question_saved'));
                    // apply changes back to scope
                    this.sectionQuestion = mergeDeepRight(this.sectionQuestion, esq) as ExamSectionQuestion;
                    this.updated.emit(this.sectionQuestion);
                },
                error: (err) => this.toast.error(err),
            }),
        );
    };
}

// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NgbCollapse, NgbDropdownModule, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import type { ExamSection } from 'src/app/exam/exam.model';
import { BaseQuestionDialogComponent } from 'src/app/question/editor/exam/base-question-dialog.component';
import { ExamQuestionDialogComponent } from 'src/app/question/editor/exam/exam-question-dialog.component';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import {
    ExamSectionQuestion,
    ExamSectionQuestionOption,
    Question,
    ReverseQuestion,
} from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';
import { Attachment } from 'src/app/shared/attachment/attachment.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { FileService } from 'src/app/shared/file/file.service';
import { MathDirective } from 'src/app/shared/math/math.directive';
import { mergeDeepRight } from 'src/app/shared/miscellaneous/helpers';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

@Component({
    selector: 'xm-section-question',
    templateUrl: './section-question.component.html',
    imports: [CdkDragHandle, NgbPopover, NgbDropdownModule, MathDirective, NgbCollapse, TranslateModule, OrderByPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionQuestionComponent {
    readonly section = input.required<ExamSection>();
    readonly sectionQuestion = input.required<ExamSectionQuestion>();
    readonly lotteryOn = input(false);
    readonly collaborative = input(false);
    readonly examId = input(0);
    readonly removed = output<ExamSectionQuestion>();
    readonly updated = output<ExamSectionQuestion>();
    readonly copied = output<ExamSectionQuestion>();

    readonly expanded = signal(false);

    private readonly http = inject(HttpClient);
    private readonly modal = inject(ModalService);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly Confirmation = inject(ConfirmationDialogService);
    private readonly Question = inject(QuestionService);
    private readonly QuestionScore = inject(QuestionScoringService);
    private readonly Attachment = inject(AttachmentService);
    private readonly Files = inject(FileService);

    toggleExpanded() {
        this.expanded.update((v) => !v);
    }

    calculateWeightedMaxPoints() {
        return this.QuestionScore.calculateWeightedMaxPoints(this.sectionQuestion());
    }

    calculateWeightedMinPoints() {
        return this.QuestionScore.calculateWeightedMinPoints(this.sectionQuestion());
    }

    getCorrectClaimChoiceOptionScore() {
        return this.QuestionScore.getCorrectClaimChoiceOptionScore(this.sectionQuestion());
    }

    getMinimumOptionScore() {
        return this.QuestionScore.getMinimumOptionScore(this.sectionQuestion());
    }

    editQuestion() {
        this.openExamQuestionEditor();
    }

    downloadQuestionAttachment() {
        const currentSectionQuestion = this.sectionQuestion();
        if (this.collaborative()) {
            this.Attachment.downloadCollaborativeQuestionAttachment(this.examId(), currentSectionQuestion);
        }
        this.Attachment.downloadQuestionAttachment(currentSectionQuestion.question);
    }

    removeQuestion() {
        this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_remove_question'),
        ).subscribe({
            next: () => this.removed.emit(this.sectionQuestion()),
        });
    }

    copyQuestion() {
        this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_copy_question'),
        ).subscribe({
            next: () => this.copied.emit(this.sectionQuestion()),
        });
    }

    determineClaimOptionType(examOption: ExamSectionQuestionOption) {
        return this.Question.determineClaimOptionTypeForExamQuestionOption(examOption);
    }

    private getQuestionDistribution$ = () => {
        if (this.collaborative()) {
            return of({ distributed: false });
        }
        return this.Question.getQuestionDistribution$(this.sectionQuestion().id);
    };

    private openExamQuestionEditor() {
        this.getQuestionDistribution$().subscribe((data) => {
            if (!data.distributed) {
                // If this is not distributed, treat it as a plain question (or at least trick the user to
                // believe so)
                this.openBaseQuestionEditor();
            } else {
                this.openDistributedQuestionEditor();
            }
        });
    }

    private getResource(url: string) {
        return this.collaborative() ? url.replace('/app/exams/', '/app/iop/exams/') : url;
    }

    private openBaseQuestionEditor() {
        const currentSectionQuestion = this.sectionQuestion();
        const modal = this.modal.openRef(BaseQuestionDialogComponent, {
            windowClass: 'xm-xxl-modal',
            size: 'xl',
        });

        modal.componentInstance.lotteryOn.set(this.lotteryOn());
        modal.componentInstance.collaborative.set(this.collaborative());
        modal.componentInstance.examId.set(this.examId());
        if (this.collaborative()) {
            // IOP question IDs can't be fetched via /app/questions — pass data directly
            modal.componentInstance.question.set(currentSectionQuestion.question as ReverseQuestion);
        } else {
            modal.componentInstance.questionId.set(currentSectionQuestion.question.id);
        }

        this.modal
            .result$<Question>(modal)
            .pipe(
                switchMap((question: Question) => {
                    const resource = `/app/exams/${this.examId()}/sections/${this.section().id}/questions/${currentSectionQuestion.id}`;
                    return this.http
                        .put<ExamSectionQuestion>(this.getResource(resource), {
                            question: question,
                        })
                        .pipe(map((resp) => ({ resp, question })));
                }),
                tap(({ resp }) => {
                    const updated = mergeDeepRight(currentSectionQuestion, resp) as ExamSectionQuestion;
                    this.updated.emit(updated);
                }),
                switchMap(({ question }) => {
                    if (!this.collaborative()) {
                        return of(undefined);
                    }
                    const attachment = question.attachment;
                    if (!attachment) {
                        return of(undefined);
                    }
                    if (attachment.modified && attachment.file) {
                        return this.Files.upload$<Attachment>('/app/iop/collab/attachment/question', attachment.file, {
                            examId: this.examId().toString(),
                            questionId: currentSectionQuestion.id.toString(),
                        });
                    } else if (attachment.removed) {
                        this.Attachment.eraseCollaborativeQuestionAttachment$(
                            this.examId(),
                            currentSectionQuestion.id,
                        ).subscribe(() => {
                            const current = this.sectionQuestion();
                            const updated = { ...current, question: { ...current.question } };
                            delete updated.question.attachment;
                            this.updated.emit(updated);
                        });
                    }
                    return of(undefined);
                }),
            )
            .subscribe({
                next: (resp) => {
                    if (resp) {
                        const current = this.sectionQuestion();
                        const updated = {
                            ...current,
                            question: { ...current.question, attachment: resp },
                        };
                        this.updated.emit(updated);
                    }
                },
                error: (err) => this.toast.error(err),
            });
    }

    private openDistributedQuestionEditor() {
        const currentSectionQuestion = this.sectionQuestion();
        const modal = this.modal.openRef(ExamQuestionDialogComponent, {
            windowClass: 'xm-xxl-modal',
            keyboard: false,
        });
        modal.componentInstance.examQuestion.set({ ...currentSectionQuestion });
        modal.componentInstance.lotteryOn.set(this.lotteryOn());
        this.modal.result$<{ question: Question; examQuestion: ExamSectionQuestion }>(modal).subscribe((data) =>
            this.Question.updateDistributedExamQuestion$(
                data.question,
                data.examQuestion,
                this.examId(),
                this.section().id,
            ).subscribe({
                next: (esq: ExamSectionQuestion) => {
                    this.toast.info(this.translate.instant('i18n_question_saved'));
                    // apply changes back to scope
                    const updated = mergeDeepRight(currentSectionQuestion, esq) as ExamSectionQuestion;
                    this.updated.emit(updated);
                },
                error: (err) => this.toast.error(err),
            }),
        );
    }
}

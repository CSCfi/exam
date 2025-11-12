// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { HttpClient } from '@angular/common/http';
import {
    ApplicationRef,
    ChangeDetectionStrategy,
    Component,
    effect,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
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
import { of } from 'rxjs';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionQuestionComponent {
    sectionQuestion = input.required<ExamSectionQuestion>();
    lotteryOn = input(false);
    collaborative = input(false);
    section = input.required<ExamSection>();
    examId = input(0);
    removed = output<ExamSectionQuestion>();
    updated = output<ExamSectionQuestion>();
    copied = output<ExamSectionQuestion>();

    expanded = signal(false);

    private http = inject(HttpClient);
    private modal = inject(ModalService);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Confirmation = inject(ConfirmationDialogService);
    private Question = inject(QuestionService);
    private QuestionScore = inject(QuestionScoringService);
    private Attachment = inject(AttachmentService);
    private Files = inject(FileService);
    private appRef = inject(ApplicationRef);

    constructor() {
        effect(() => {
            const sq = this.sectionQuestion();
            this.expanded.set(sq.expanded ?? false);
        });
    }

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
        const modal = this.modal.openRef(BaseQuestionEditorComponent, {
            windowClass: 'xm-xxl-modal',
            size: 'xl',
        });

        modal.componentInstance.isPopup.set(true);
        modal.componentInstance.lotteryOn.set(this.lotteryOn());
        modal.componentInstance.questionDraft.set({ ...currentSectionQuestion.question, examSectionQuestions: [] });
        modal.componentInstance.collaborative.set(this.collaborative());
        modal.componentInstance.examId.set(this.examId());
        modal.componentInstance.sectionQuestion.set(currentSectionQuestion);
        modal.componentInstance.questionId.set(currentSectionQuestion.question.id || 0);

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
            size: 'xl',
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

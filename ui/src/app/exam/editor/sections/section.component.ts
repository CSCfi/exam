// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    CdkDrag,
    CdkDragDrop,
    CdkDragPlaceholder,
    CdkDragPreview,
    CdkDropList,
    moveItemInArray,
} from '@angular/cdk/drag-drop';

import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output, ViewEncapsulation, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
import { switchMap } from 'rxjs/operators';
import type { ExamMaterial, ExamSection } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { BaseQuestionEditorComponent } from 'src/app/question/examquestion/base-question-editor.component';
import { QuestionSelectorComponent } from 'src/app/question/picker/question-picker.component';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import { ExamSectionQuestion, Question } from 'src/app/question/question.model';
import { Attachment } from 'src/app/shared/attachment/attachment.model';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { FileService } from 'src/app/shared/file/file.service';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { SectionQuestionComponent } from './section-question.component';

@Component({
    selector: 'xm-section',
    encapsulation: ViewEncapsulation.None,
    templateUrl: './section.component.html',
    imports: [
        NgbPopover,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        NgbDropdownItem,
        FormsModule,
        NgbCollapse,
        CdkDropList,
        CdkDrag,
        CdkDragPlaceholder,
        CdkDragPreview,
        SectionQuestionComponent,
        TranslateModule,
        OrderByPipe,
    ],
    styleUrls: ['./sections.shared.scss'],
})
export class SectionComponent {
    @Input() section!: ExamSection;
    @Input() index = 0;
    @Input() examId = 0;
    @Input() canBeOptional = false;
    @Input() collaborative = false;
    @Input() materials: ExamMaterial[] = [];

    @Output() removed = new EventEmitter<ExamSection>();
    @Output() materialsChanged = new EventEmitter<void>();

    private http = inject(HttpClient);
    private translate = inject(TranslateService);
    private modal = inject(ModalService);
    private toast = inject(ToastrService);
    private dialogs = inject(ConfirmationDialogService);
    private QuestionScore = inject(QuestionScoringService);
    private Files = inject(FileService);
    private Exam = inject(ExamService);

    questionPointsMatch = () => {
        const sectionQuestions = this.section.sectionQuestions;
        if (!sectionQuestions || sectionQuestions.length < 2) {
            return true;
        }
        const score = this.getQuestionScore(sectionQuestions[0]);
        return sectionQuestions.every((sq) => score === this.getQuestionScore(sq));
    };

    clearAllQuestions = () =>
        this.dialogs
            .open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_remove_all_questions'))
            .pipe(
                switchMap(() =>
                    this.http.delete(
                        this.getResource(`/app/exams/${this.examId}/sections/${this.section.id}/questions`),
                    ),
                ),
            )
            .subscribe({
                next: () => {
                    this.section.sectionQuestions.splice(0, this.section.sectionQuestions.length);
                    this.section.lotteryOn = false;
                    this.toast.info(this.translate.instant('i18n_all_questions_removed'));
                },
                error: (err) => this.toast.error(err),
            });

    removeSection = () =>
        this.dialogs
            .open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_remove_section'))
            .subscribe({ next: () => this.removed.emit(this.section), error: (err) => this.toast.error(err) });

    renameSection = () => this.updateSection(false);
    expandSection = () => this.updateSection(true);

    lotteryDisabled = () =>
        !this.section.sectionQuestions || this.section.sectionQuestions.length < 2 || !this.questionPointsMatch();

    onMaterialsChanged = () => this.materialsChanged.emit();

    toggleLottery = () => {
        if (this.lotteryDisabled()) {
            this.section.lotteryOn = false;
            return;
        }
        if (!this.questionPointsMatch()) {
            this.toast.error(this.translate.instant('i18n_error_lottery_points_not_match'));
            this.section.lotteryOn = false;
            return;
        }
        this.http
            .put(this.getResource(`/app/exams/${this.examId}/sections/${this.section.id}`), this.getSectionPayload())
            .subscribe({
                next: () => {
                    if (!this.section.lotteryItemCount) {
                        this.section.lotteryItemCount = 1;
                    }
                    if (!this.section.lotteryOn) {
                        this.section.lotteryItemCount = 0;
                    }
                    this.toast.info(this.translate.instant('i18n_section_updated'));
                },
                error: (err) => this.toast.error(err),
            });
    };

    updateLotteryCount = () => {
        if (!this.section.lotteryItemCount) {
            this.toast.warning(this.translate.instant('i18n_warn_lottery_count'));
            this.section.lotteryItemCount = 1;
        } else if (this.section.lotteryItemCount > this.section.sectionQuestions.length) {
            this.toast.warning(this.translate.instant('i18n_warn_lottery_count'));
            this.section.lotteryItemCount = this.section.sectionQuestions.length;
        } else {
            this.updateSection(false);
        }
    };

    moveQuestion(event: CdkDragDrop<string[]>) {
        const [from, to] = [event.previousIndex, event.currentIndex];
        if (from >= 0 && to >= 0 && from !== to) {
            this.http
                .put(this.getResource(`/app/exams/${this.examId}/sections/${this.section.id}/reorder`), {
                    from: from,
                    to: to,
                })
                .subscribe(() => {
                    this.toast.info(this.translate.instant('i18n_questions_reordered'));
                    moveItemInArray(this.section.sectionQuestions, from, to);
                    this.updateIndices();
                });
        }
    }

    addNewQuestion = () => {
        if (this.section.lotteryOn) {
            this.toast.error(this.translate.instant('i18n_error_drop_disabled_lottery_on'));
            return;
        }
        this.openBaseQuestionEditor();
    };

    removeQuestion = (sq: ExamSectionQuestion) => {
        this.http
            .delete<ExamSection>(
                this.getResource(`/app/exams/${this.examId}/sections/${this.section.id}/questions/${sq.question.id}`),
            )
            .subscribe({
                next: (resp) => {
                    this.section.sectionQuestions.splice(this.section.sectionQuestions.indexOf(sq), 1);
                    this.toast.info(this.translate.instant('i18n_question_removed'));
                    this.updateSection(true);
                    if (this.section.sectionQuestions.length < 2 && this.section.lotteryOn) {
                        // turn off lottery
                        this.section.lotteryOn = false;
                        this.section.lotteryItemCount = 1;
                        this.updateSection(true);
                    } else if (this.section.lotteryOn) {
                        this.section.lotteryItemCount = resp.lotteryItemCount;
                    }
                },
                error: (err) => this.toast.error(err),
            });
    };

    copyQuestion = (sq: ExamSectionQuestion) =>
        this.http.post<Question>(`/app/question/${sq.question.id}`, {}).subscribe({
            next: (copy) => {
                this.insertExamQuestion(copy, sq.sequenceNumber);
                this.toast.info(this.translate.instant('i18n_question_copied'));
            },
            error: (err) => this.toast.error(err),
        });

    updateQuestion = (sq: ExamSectionQuestion) => {
        const index = this.section.sectionQuestions.findIndex((q) => q.id == sq.id);
        this.section.sectionQuestions[index] = sq;
    };

    openLibrary = () => {
        if (this.section.lotteryOn) {
            this.toast.error(this.translate.instant('i18n_error_drop_disabled_lottery_on'));
            return;
        }
        const modal = this.modal.openRef(QuestionSelectorComponent, { windowClass: 'xm-xxl-modal' });
        modal.componentInstance.examId = this.examId;
        modal.componentInstance.sectionId = this.section.id;
        modal.componentInstance.questionCount = this.section.sectionQuestions.length;
        this.modal
            .result$<ExamSectionQuestion[]>(modal)
            .subscribe(
                (questions) => (this.section.sectionQuestions = [...this.section.sectionQuestions, ...questions]),
            );
    };

    getSectionTotalScore = () => this.Exam.getSectionMaxScore(this.section);

    getAmountOfSelectionEvaluatedQuestions = () =>
        this.section.sectionQuestions.filter((q) => q.evaluationType === 'Selection').length;

    private updateIndices = () => this.section.sectionQuestions.forEach((sq, i) => (sq.sequenceNumber = i));

    private updateSection = (silent: boolean) => {
        this.http
            .put<ExamSection>(
                this.getResource(`/app/exams/${this.examId}/sections/${this.section.id}`),
                this.getSectionPayload(),
            )
            .subscribe({
                next: () => {
                    if (!silent) {
                        this.toast.info(this.translate.instant('i18n_section_updated'));
                    }
                },
                error: () => (this.section.optional = !this.section.optional),
            });
    };

    private getResource = (url: string) => (this.collaborative ? url.replace('/app/exams/', '/app/iop/exams/') : url);

    private getSectionPayload = () => ({
        id: this.section.id,
        name: this.section.name,
        lotteryOn: this.section.lotteryOn,
        lotteryItemCount: this.section.lotteryOn ? this.section.lotteryItemCount : 0,
        description: this.section.description,
        expanded: this.section.expanded,
        optional: this.section.optional,
    });

    private getQuestionScore = (question: ExamSectionQuestion) => this.QuestionScore.calculateMaxScore(question);

    private insertExamQuestion = (question: Question, seq: number) => {
        const resource = this.collaborative
            ? `/app/iop/exams/${this.examId}/sections/${this.section.id}/questions`
            : `/app/exams/${this.examId}/sections/${this.section.id}/questions/${question.id}`;
        const data = { sequenceNumber: seq, question: this.collaborative ? question : undefined };
        this.http.post<ExamSection | ExamSectionQuestion>(resource, data).subscribe({
            next: (resp) => {
                // Add new section question to existing section
                if (!this.collaborative) {
                    const section = resp as ExamSection;
                    const examSectionQuestion = section.sectionQuestions.find((esq) => esq.question.id === question.id);
                    if (examSectionQuestion) {
                        this.section.sectionQuestions = [...this.section.sectionQuestions, examSectionQuestion];
                    }
                    return;
                }
                // Collaborative exam question handling.
                const newSectionQuestion = resp as ExamSectionQuestion;
                this.addCollabAttachment(newSectionQuestion, question, () => {
                    const uploadedAttachment = question.attachment;
                    if (uploadedAttachment) {
                        newSectionQuestion.question.attachment = uploadedAttachment;
                    }
                });
                this.section.sectionQuestions = [...this.section.sectionQuestions, newSectionQuestion];
            },
            error: (err) => this.toast.error(err),
        });
    };

    private addCollabAttachment = (data: ExamSectionQuestion, question: Question, callback: () => void) => {
        const attachment = question.attachment;
        if (!attachment) {
            return;
        }

        if (attachment.modified && attachment.file) {
            this.Files.upload$<Attachment>('/app/iop/collab/attachment/question', attachment.file, {
                examId: this.examId.toString(),
                questionId: data.id.toString(),
            }).subscribe((resp) => {
                question.attachment = resp;
                callback();
            });
        }
    };

    private openBaseQuestionEditor = () => {
        const modal = this.modal.openRef(BaseQuestionEditorComponent, {
            windowClass: 'question-editor-modal',
            size: 'xl',
        });
        modal.componentInstance.newQuestion = true;
        modal.componentInstance.collaborative = this.collaborative;
        modal.componentInstance.isPopup = true;
        this.modal
            .result$<Question>(modal)
            .subscribe((resp) => this.insertExamQuestion(resp, this.section.sectionQuestions.length));
    };
}

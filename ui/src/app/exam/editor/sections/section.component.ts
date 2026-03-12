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
import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    ViewEncapsulation,
    computed,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { FormField, disabled, form, max, min, required } from '@angular/forms/signals';
import { NgbCollapse, NgbDropdownModule, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { switchMap } from 'rxjs/operators';
import type { ExamMaterial, ExamSection } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { BaseQuestionDialogComponent } from 'src/app/question/editor/exam/base-question-dialog.component';
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
        NgbDropdownModule,
        FormField,
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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionComponent implements OnInit {
    readonly section = input.required<ExamSection>();
    readonly index = input(0);
    readonly examId = input(0);
    readonly canBeOptional = input(false);
    readonly collaborative = input(false);
    readonly materials = input<ExamMaterial[]>([]);

    readonly removed = output<ExamSection>();
    readonly updated = output<ExamSection>();
    readonly materialsChanged = output<void>();

    readonly expanded = computed(() => {
        const override = this.expandedOverride();
        return override !== undefined ? override : (this.section().expanded ?? false);
    });
    readonly sectionForm = form(
        signal({ name: '', description: '', optional: false, lotteryOn: false, lotteryItemCount: 1 }),
        (path) => {
            required(path.name);
            disabled(path.lotteryOn, () => this.lotteryDisabled());
            min(path.lotteryItemCount, 1);
            max(path.lotteryItemCount, () => this.section().sectionQuestions.length);
        },
    );

    private readonly expandedOverride = signal<boolean | undefined>(undefined);
    private readonly http = inject(HttpClient);
    private readonly translate = inject(TranslateService);
    private readonly modal = inject(ModalService);
    private readonly toast = inject(ToastrService);
    private readonly dialogs = inject(ConfirmationDialogService);
    private readonly QuestionScore = inject(QuestionScoringService);
    private readonly Files = inject(FileService);
    private readonly Exam = inject(ExamService);

    ngOnInit() {
        const s = this.section();
        this.sectionForm.name().value.set(s.name || '');
        this.sectionForm.description().value.set(s.description || '');
        this.sectionForm.optional().value.set(s.optional ?? false);
        this.sectionForm.lotteryOn().value.set(s.lotteryOn ?? false);
        this.sectionForm.lotteryItemCount().value.set(s.lotteryItemCount ?? 1);
    }

    questionPointsMatch() {
        const currentSection = this.section();
        const sectionQuestions = currentSection.sectionQuestions;
        if (!sectionQuestions || sectionQuestions.length < 2) {
            return true;
        }
        const score = this.getQuestionScore(sectionQuestions[0]);
        return sectionQuestions.every((sq) => score === this.getQuestionScore(sq));
    }

    clearAllQuestions() {
        const currentSection = this.section();
        this.dialogs
            .open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_remove_all_questions'))
            .pipe(
                switchMap(() =>
                    this.http.delete(
                        this.getResource(`/app/exams/${this.examId()}/sections/${currentSection.id}/questions`),
                    ),
                ),
            )
            .subscribe({
                next: () => {
                    const updated = {
                        ...currentSection,
                        sectionQuestions: [],
                        lotteryOn: false,
                    };
                    this.updated.emit(updated);
                    this.toast.info(this.translate.instant('i18n_all_questions_removed'));
                },
                error: (err) => this.toast.error(err),
            });
    }

    removeSection() {
        this.dialogs
            .open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_remove_section'))
            .subscribe({ next: () => this.removed.emit(this.section()), error: (err) => this.toast.error(err) });
    }

    renameSection() {
        const currentSection = this.section();
        const updated = {
            ...currentSection,
            name: this.sectionForm.name().value(),
            description: this.sectionForm.description().value(),
            optional: this.sectionForm.optional().value(),
        };
        this.updated.emit(updated);
        this.updateSection(false);
    }

    expandSection() {
        this.updateSection(true);
    }

    toggleExpanded() {
        const currentExpanded = this.expanded();
        this.expandedOverride.set(!currentExpanded);
        const currentSection = this.section();
        const updated = {
            ...currentSection,
            expanded: !currentExpanded,
        };
        this.updated.emit(updated);
        this.expandSection();
    }

    lotteryDisabled() {
        const currentSection = this.section();
        return (
            !currentSection.sectionQuestions ||
            currentSection.sectionQuestions.length < 2 ||
            !this.questionPointsMatch()
        );
    }

    onMaterialsChanged() {
        this.materialsChanged.emit();
    }

    toggleLottery() {
        const currentSection = this.section();
        if (this.lotteryDisabled()) {
            this.sectionForm.lotteryOn().value.set(false);
            const updated = { ...currentSection, lotteryOn: false };
            this.updated.emit(updated);
            return;
        }
        if (!this.questionPointsMatch()) {
            this.toast.error(this.translate.instant('i18n_error_lottery_points_not_match'));
            this.sectionForm.lotteryOn().value.set(false);
            const updated = { ...currentSection, lotteryOn: false };
            this.updated.emit(updated);
            return;
        }
        const newLotteryOn = this.sectionForm.lotteryOn().value();
        const updatedPayload = {
            ...this.getSectionPayload(),
            lotteryOn: newLotteryOn,
            lotteryItemCount: newLotteryOn ? currentSection.lotteryItemCount || 1 : 0,
        };
        this.http
            .put(this.getResource(`/app/exams/${this.examId()}/sections/${currentSection.id}`), updatedPayload)
            .subscribe({
                next: () => {
                    const updated = {
                        ...currentSection,
                        lotteryOn: newLotteryOn,
                        lotteryItemCount: newLotteryOn ? currentSection.lotteryItemCount || 1 : 0,
                    };
                    this.updated.emit(updated);
                    this.toast.info(this.translate.instant('i18n_section_updated'));
                },
                error: (err) => this.toast.error(err),
            });
    }

    updateLotteryCount() {
        const currentSection = this.section();
        let lotteryItemCount = this.sectionForm.lotteryItemCount().value() ?? 1;
        if (!lotteryItemCount) {
            this.toast.warning(this.translate.instant('i18n_warn_lottery_count'));
            lotteryItemCount = 1;
            this.sectionForm.lotteryItemCount().value.set(1);
        } else if (lotteryItemCount > currentSection.sectionQuestions.length) {
            this.toast.warning(this.translate.instant('i18n_warn_lottery_count'));
            lotteryItemCount = currentSection.sectionQuestions.length;
            this.sectionForm.lotteryItemCount().value.set(lotteryItemCount);
        }
        if (lotteryItemCount !== currentSection.lotteryItemCount) {
            const updated = { ...currentSection, lotteryItemCount };
            this.updated.emit(updated);
        }
        this.updateSection(false);
    }

    moveQuestion(event: CdkDragDrop<string[]>) {
        const currentSection = this.section();
        const [from, to] = [event.previousIndex, event.currentIndex];
        if (from >= 0 && to >= 0 && from !== to) {
            this.http
                .put(this.getResource(`/app/exams/${this.examId()}/sections/${currentSection.id}/reorder`), {
                    from: from,
                    to: to,
                })
                .subscribe(() => {
                    this.toast.info(this.translate.instant('i18n_questions_reordered'));
                    const reordered = [...currentSection.sectionQuestions];
                    moveItemInArray(reordered, from, to);
                    const updated = {
                        ...currentSection,
                        sectionQuestions: reordered.map((sq, i) => ({ ...sq, sequenceNumber: i })),
                    };
                    this.updated.emit(updated);
                });
        }
    }

    addNewQuestion() {
        const currentSection = this.section();
        if (currentSection.lotteryOn) {
            this.toast.error(this.translate.instant('i18n_error_drop_disabled_lottery_on'));
            return;
        }
        this.openBaseQuestionEditor();
    }

    removeQuestion(sq: ExamSectionQuestion) {
        const currentSection = this.section();
        this.http
            .delete<ExamSection>(
                this.getResource(
                    `/app/exams/${this.examId()}/sections/${currentSection.id}/questions/${sq.question.id}`,
                ),
            )
            .subscribe({
                next: (resp) => {
                    const filteredQuestions = currentSection.sectionQuestions.filter((q) => q.id !== sq.id);
                    let updated: ExamSection = {
                        ...currentSection,
                        sectionQuestions: filteredQuestions,
                    };
                    if (filteredQuestions.length < 2 && currentSection.lotteryOn) {
                        // turn off lottery
                        updated = {
                            ...updated,
                            lotteryOn: false,
                            lotteryItemCount: 1,
                        };
                    } else if (currentSection.lotteryOn) {
                        updated = {
                            ...updated,
                            lotteryItemCount: resp.lotteryItemCount,
                        };
                    }
                    this.updated.emit(updated);
                    this.toast.info(this.translate.instant('i18n_question_removed'));
                    this.updateSection(true);
                },
                error: (err) => this.toast.error(err),
            });
    }

    copyQuestion(sq: ExamSectionQuestion) {
        this.http.post<Question>(`/app/question/${sq.question.id}`, {}).subscribe({
            next: (copy) => {
                this.insertExamQuestion(copy, sq.sequenceNumber);
                this.toast.info(this.translate.instant('i18n_question_copied'));
            },
            error: (err) => this.toast.error(err),
        });
    }

    updateQuestion(sq: ExamSectionQuestion) {
        const currentSection = this.section();
        const updated = {
            ...currentSection,
            sectionQuestions: currentSection.sectionQuestions.map((q) => (q.id === sq.id ? sq : q)),
        };
        this.updated.emit(updated);
    }

    openLibrary() {
        const currentSection = this.section();
        if (currentSection.lotteryOn) {
            this.toast.error(this.translate.instant('i18n_error_drop_disabled_lottery_on'));
            return;
        }
        const modal = this.modal.openRef(QuestionSelectorComponent, { windowClass: 'xm-xxl-modal' });
        modal.componentInstance.examId.set(this.examId());
        modal.componentInstance.sectionId.set(currentSection.id);
        modal.componentInstance.questionCount.set(currentSection.sectionQuestions.length);
        this.modal.result$<ExamSectionQuestion[]>(modal).subscribe((questions) => {
            const updated = {
                ...currentSection,
                sectionQuestions: [...currentSection.sectionQuestions, ...questions],
            };
            this.updated.emit(updated);
        });
    }

    getSectionTotalScore() {
        return this.Exam.getSectionMaxScore(this.section());
    }

    getAmountOfSelectionEvaluatedQuestions() {
        return this.section().sectionQuestions.filter((q) => q.evaluationType === 'Selection').length;
    }

    private updateSection(silent: boolean) {
        const currentSection = this.section();
        this.http
            .put<ExamSection>(
                this.getResource(`/app/exams/${this.examId()}/sections/${currentSection.id}`),
                this.getSectionPayload(),
            )
            .subscribe({
                next: () => {
                    if (!silent) {
                        this.toast.info(this.translate.instant('i18n_section_updated'));
                    }
                },
                error: () => {
                    const updated = { ...currentSection, optional: !currentSection.optional };
                    this.updated.emit(updated);
                },
            });
    }

    private getResource(url: string) {
        return this.collaborative() ? url.replace('/app/exams/', '/app/iop/exams/') : url;
    }

    private getSectionPayload() {
        const currentSection = this.section();
        const lotteryOn = this.sectionForm.lotteryOn().value();
        return {
            id: currentSection.id,
            name: this.sectionForm.name().value(),
            lotteryOn,
            lotteryItemCount: lotteryOn ? this.sectionForm.lotteryItemCount().value() : 0,
            description: this.sectionForm.description().value(),
            expanded: currentSection.expanded,
            optional: this.sectionForm.optional().value(),
        };
    }

    private getQuestionScore(question: ExamSectionQuestion) {
        return this.QuestionScore.calculateMaxScore(question);
    }

    private insertExamQuestion(question: Question, seq: number) {
        const currentSection = this.section();
        const resource = this.collaborative()
            ? `/app/iop/exams/${this.examId()}/sections/${currentSection.id}/questions`
            : `/app/exams/${this.examId()}/sections/${currentSection.id}/questions/${question.id}`;
        const data = { sequenceNumber: seq, question: this.collaborative() ? question : undefined };
        this.http.post<ExamSection | ExamSectionQuestion>(resource, data).subscribe({
            next: (resp) => {
                // Add new section question to existing section
                if (!this.collaborative()) {
                    const section = resp as ExamSection;
                    let examSectionQuestion = section.sectionQuestions.find((esq) => esq.question.id === question.id);
                    if (examSectionQuestion) {
                        if (examSectionQuestion.question.attachment && question.attachment?.fileName) {
                            examSectionQuestion = {
                                ...examSectionQuestion,
                                question: {
                                    ...examSectionQuestion.question,
                                    attachment: {
                                        ...examSectionQuestion.question.attachment,
                                        fileName: question.attachment.fileName,
                                    },
                                },
                            };
                        }
                        const updated = {
                            ...currentSection,
                            sectionQuestions: [...currentSection.sectionQuestions, examSectionQuestion],
                        };
                        this.updated.emit(updated);
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
                    const updated = {
                        ...currentSection,
                        sectionQuestions: [...currentSection.sectionQuestions, newSectionQuestion],
                    };
                    this.updated.emit(updated);
                });
            },
            error: (err) => this.toast.error(err),
        });
    }

    private addCollabAttachment(data: ExamSectionQuestion, question: Question, callback: () => void) {
        const attachment = question.attachment;
        if (!attachment) {
            return;
        }

        if (attachment.modified && attachment.file) {
            this.Files.upload$<Attachment>('/app/iop/collab/attachment/question', attachment.file, {
                examId: this.examId().toString(),
                questionId: data.id.toString(),
            }).subscribe((resp) => {
                question.attachment = resp;
                callback();
            });
        }
    }

    private openBaseQuestionEditor() {
        const modal = this.modal.openRef(BaseQuestionDialogComponent, {
            windowClass: 'xm-xxl-modal',
            keyboard: false,
        });
        // Don't set question or questionId - component will create new empty question
        modal.componentInstance.collaborative.set(this.collaborative());

        this.modal.result$<Question>(modal).subscribe((resp) => {
            const currentSection = this.section();
            this.insertExamQuestion(resp, currentSection.sectionQuestions.length);
        });
    }
}

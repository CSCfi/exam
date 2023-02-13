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
import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { noop } from 'rxjs';
import { QuestionSelectorComponent } from '../../../question/picker/question-picker.component';
import { QuestionService } from '../../../question/question.service';
import { ConfirmationDialogService } from '../../../shared/dialogs/confirmation-dialog.service';
import { FileService } from '../../../shared/file/file.service';
import type { ExamMaterial, ExamSection, ExamSectionQuestion, Question } from '../../exam.model';
import { ExamService } from '../../exam.service';

@Component({
    selector: 'xm-section',
    encapsulation: ViewEncapsulation.None,
    templateUrl: './section.component.html',
})
export class SectionComponent implements OnInit, OnChanges {
    @Input() section!: ExamSection;
    @Input() index = 0;
    @Input() examId = 0;
    @Input() canBeOptional = false;
    @Input() collaborative = false;
    @Input() materials: ExamMaterial[] = [];

    @Output() removed = new EventEmitter<ExamSection>();
    @Output() materialsChanged = new EventEmitter<void>();

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private modal: NgbModal,
        private toast: ToastrService,
        private dialogs: ConfirmationDialogService,
        private Question: QuestionService,
        private Files: FileService,
        private Exam: ExamService,
    ) {}

    ngOnInit() {
        this.updateSection(true);
    }

    ngOnChanges() {
        this.updateSection(true);
    }

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
            .open$(this.translate.instant('sitnet_confirm'), this.translate.instant('sitnet_remove_all_questions'))
            .subscribe({
                next: () => {
                    this.http
                        .delete(this.getResource(`/app/exams/${this.examId}/sections/${this.section.id}/questions`))
                        .subscribe({
                            next: () => {
                                this.section.sectionQuestions.splice(0, this.section.sectionQuestions.length);
                                this.section.lotteryOn = false;
                                this.toast.info(this.translate.instant('sitnet_all_questions_removed'));
                            },
                            error: this.toast.error,
                        });
                },
                error: this.toast.error,
            });

    removeSection = () =>
        this.dialogs
            .open$(this.translate.instant('sitnet_confirm'), this.translate.instant('sitnet_remove_section'))
            .subscribe({ next: () => this.removed.emit(this.section), error: this.toast.error });

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
            this.toast.error(this.translate.instant('sitnet_error_lottery_points_not_match'));
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
                    this.toast.info(this.translate.instant('sitnet_section_updated'));
                },
                error: this.toast.error,
            });
    };

    updateLotteryCount = () => {
        if (!this.section.lotteryItemCount) {
            this.toast.warning(this.translate.instant('sitnet_warn_lottery_count'));
            this.section.lotteryItemCount = 1;
        } else if (this.section.lotteryItemCount > this.section.sectionQuestions.length) {
            this.toast.warning(this.translate.instant('sitnet_warn_lottery_count'));
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
                    this.toast.info(this.translate.instant('sitnet_questions_reordered'));
                    moveItemInArray(this.section.sectionQuestions, from, to);
                    this.updateIndices();
                });
        }
    }

    addNewQuestion = () => {
        if (this.section.lotteryOn) {
            this.toast.error(this.translate.instant('sitnet_error_drop_disabled_lottery_on'));
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
                    this.toast.info(this.translate.instant('sitnet_question_removed'));
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
                error: this.toast.error,
            });
    };

    updateQuestion = (sq: ExamSectionQuestion) => {
        const index = this.section.sectionQuestions.findIndex((q) => q.id == sq.id);
        this.section.sectionQuestions[index] = sq;
    };

    openLibrary = () => {
        if (this.section.lotteryOn) {
            this.toast.error(this.translate.instant('sitnet_error_drop_disabled_lottery_on'));
            return;
        }
        const modal = this.modal.open(QuestionSelectorComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'xl',
        });
        modal.componentInstance.examId = this.examId;
        modal.componentInstance.sectionId = this.section.id;
        modal.componentInstance.questionCount = this.section.sectionQuestions.length;
        modal.result
            .then(
                (questions: ExamSectionQuestion[]) =>
                    (this.section.sectionQuestions = [...this.section.sectionQuestions, ...questions]),
            )
            .catch(noop);
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
                        this.toast.info(this.translate.instant('sitnet_section_updated'));
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

    private getQuestionScore = (question: ExamSectionQuestion) => this.Question.calculateMaxScore(question);

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
            error: this.toast.error,
        });
    };

    private addCollabAttachment = (data: ExamSectionQuestion, question: Question, callback: () => void) => {
        const attachment = question.attachment;
        if (!attachment) {
            return;
        }

        if (attachment.modified && attachment.file) {
            this.Files.upload(
                '/app/iop/collab/attachment/question',
                attachment.file,
                { examId: this.examId.toString(), questionId: data.id.toString() },
                question,
                callback,
            );
        }
    };

    private openBaseQuestionEditor = () =>
        this.Question.openBaseQuestionEditor(true, this.collaborative).subscribe((resp) =>
            this.insertExamQuestion(resp, this.section.sectionQuestions.length),
        );
}

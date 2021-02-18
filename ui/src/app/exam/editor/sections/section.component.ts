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
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { noop } from 'rxjs';
import * as toast from 'toastr';

import { QuestionService } from '../../../question/question.service';
import { QuestionSelectorComponent } from '../../../question/selector/questionSelector.component';
import { ConfirmationDialogService } from '../../../utility/dialogs/confirmationDialog.service';
import { FileService } from '../../../utility/file/file.service';
import { ExamSection } from '../../exam.model';
import { ExamService } from '../../exam.service';

import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import type { ExamMaterial, ExamSectionQuestion, Question } from '../../exam.model';
@Component({
    selector: 'section',
    encapsulation: ViewEncapsulation.None,
    templateUrl: './section.component.html',
})
export class SectionComponent {
    @Input() section: ExamSection;
    @Input() examId: number;
    @Input() canBeOptional: boolean;
    @Input() collaborative: boolean;
    @Input() materials: ExamMaterial[];

    @Output() onDelete = new EventEmitter<ExamSection>();
    @Output() onMaterialsChanged = new EventEmitter<void>();

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private modal: NgbModal,
        private dialogs: ConfirmationDialogService,
        private Question: QuestionService,
        private Files: FileService,
        private Exam: ExamService,
    ) {}

    ngOnInit() {
        this.section.sectionQuestions.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    }

    private getResource = (url: string) =>
        this.collaborative ? url.replace('/app/exams/', '/integration/iop/exams/') : url;

    private getSectionPayload = () => ({
        id: this.section.id,
        name: this.section.name,
        lotteryOn: this.section.lotteryOn,
        lotteryItemCount: this.section.lotteryItemCount,
        description: this.section.description,
        expanded: this.section.expanded,
        optional: this.section.optional,
    });

    private getQuestionScore = (question: ExamSectionQuestion) => {
        const evaluationType = question.evaluationType;
        const type = question.question.type;
        if (evaluationType === 'Points' || type === 'MultipleChoiceQuestion' || type === 'ClozeTestQuestion') {
            return question.maxScore;
        }
        if (type === 'WeightedMultipleChoiceQuestion') {
            return this.Question.calculateMaxPoints(question);
        }
        if (type === 'ClaimChoiceQuestion') {
            return this.Question.getCorrectClaimChoiceOptionScore(question);
        }
        return null;
    };

    private questionPointsMatch = () => {
        const sectionQuestions = this.section.sectionQuestions;
        if (!sectionQuestions || sectionQuestions.length < 2) {
            return true;
        }
        const score = this.getQuestionScore(sectionQuestions[0]);
        return sectionQuestions.every((sq) => score === this.getQuestionScore(sq));
    };

    private updateSection = (silent: boolean) => {
        this.http
            .put<ExamSection>(
                this.getResource(`/app/exams/${this.examId}/sections/${this.section.id}`),
                this.getSectionPayload(),
            )
            .subscribe(
                () => {
                    if (!silent) {
                        toast.info(this.translate.instant('sitnet_section_updated'));
                    }
                },
                () => (this.section.optional = !this.section.optional),
            );
    };

    private insertExamQuestion = (question: Question, seq: number) => {
        const resource = this.collaborative
            ? `/integration/iop/exams/${this.examId}/sections/${this.section.id}/questions`
            : `/app/exams/${this.examId}/sections/${this.section.id}/questions/${question.id}`;
        const data = { sequenceNumber: seq, question: this.collaborative ? question : undefined };
        this.http.post<ExamSection | ExamSectionQuestion>(resource, data).subscribe(
            (resp) => {
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
                this.addAttachment(newSectionQuestion, question, () => {
                    const uploadedAttachment = question.attachment;
                    if (uploadedAttachment) {
                        newSectionQuestion.question.attachment = uploadedAttachment;
                    }
                });
                this.section.sectionQuestions = [...this.section.sectionQuestions, newSectionQuestion];
            },
            (err) => toast.error(err.data),
        );
    };

    private addAttachment = (data: ExamSectionQuestion, question: Question, callback: () => void) => {
        const attachment = question.attachment;
        if (!attachment) {
            return;
        }

        if (attachment.modified && attachment.file) {
            this.Files.upload(
                '/integration/iop/attachment/question',
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

    clearAllQuestions = () => {
        const dialog = this.dialogs.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_remove_all_questions'),
        );
        dialog.result.then(() => {
            this.http
                .delete(this.getResource(`/app/exams/${this.examId}/sections/${this.section.id}/questions`))
                .subscribe(
                    () => {
                        this.section.sectionQuestions.splice(0, this.section.sectionQuestions.length);
                        this.section.lotteryOn = false;
                        toast.info(this.translate.instant('sitnet_all_questions_removed'));
                    },
                    (resp) => toast.error(resp.data),
                );
        });
    };

    removeSection = () => {
        const dialog = this.dialogs.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_remove_section'),
        );
        dialog.result.then(() => this.onDelete.emit(this.section));
    };

    renameSection = () => this.updateSection(false);
    expandSection = () => this.updateSection(true);

    toggleDisabled = () => !this.section.sectionQuestions || this.section.sectionQuestions.length < 2;

    materialsChanged = () => this.onMaterialsChanged.emit();

    toggleLottery = () => {
        if (this.toggleDisabled()) {
            this.section.lotteryOn = false;
            return;
        }

        if (!this.questionPointsMatch()) {
            toast.error(this.translate.instant('sitnet_error_lottery_points_not_match'));
            this.section.lotteryOn = false;
            return;
        }
        this.http
            .put(this.getResource(`/app/exams/${this.examId}/sections/${this.section.id}`), this.getSectionPayload())
            .subscribe(
                () => {
                    if (this.section.lotteryItemCount === undefined) {
                        this.section.lotteryItemCount = 1;
                    }
                    toast.info(this.translate.instant('sitnet_section_updated'));
                },
                (resp) => toast.error(resp.data),
            );
    };

    updateLotteryCount = () => {
        if (!this.section.lotteryItemCount) {
            toast.warning(this.translate.instant('sitnet_warn_lottery_count'));
            this.section.lotteryItemCount = 1;
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
                    toast.info(this.translate.instant('sitnet_questions_reordered'));
                    moveItemInArray(this.section.sectionQuestions, from, to);
                });
        }
    }

    addNewQuestion = () => {
        if (this.section.lotteryOn) {
            toast.error(this.translate.instant('sitnet_error_drop_disabled_lottery_on'));
            return;
        }
        this.openBaseQuestionEditor();
    };

    removeQuestion = (sq: ExamSectionQuestion) => {
        this.http
            .delete<ExamSection>(
                this.getResource(`/app/exams/${this.examId}/sections/${this.section.id}/questions/${sq.question.id}`),
            )
            .subscribe(
                (resp) => {
                    this.section.sectionQuestions.splice(this.section.sectionQuestions.indexOf(sq), 1);
                    toast.info(this.translate.instant('sitnet_question_removed'));
                    if (this.section.sectionQuestions.length < 2 && this.section.lotteryOn) {
                        // turn off lottery
                        this.section.lotteryOn = false;
                        this.section.lotteryItemCount = 1;
                        this.updateSection(true);
                    } else if (this.section.lotteryOn) {
                        this.section.lotteryItemCount = resp.lotteryItemCount;
                    }
                },
                (resp) => toast.error(resp.data),
            );
    };

    openLibrary = () => {
        if (this.section.lotteryOn) {
            toast.error(this.translate.instant('sitnet_error_drop_disabled_lottery_on'));
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
}

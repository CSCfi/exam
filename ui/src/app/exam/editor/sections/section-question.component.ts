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
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { mergeDeepRight } from 'ramda';
import { from, noop, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseQuestionEditorComponent } from '../../../question/examquestion/base-question-editor.component';
import { ExamQuestionEditorComponent } from '../../../question/examquestion/exam-question-editor.component';
import { QuestionService } from '../../../question/question.service';
import { AttachmentService } from '../../../shared/attachment/attachment.service';
import { ConfirmationDialogService } from '../../../shared/dialogs/confirmation-dialog.service';
import { FileService } from '../../../shared/file/file.service';
import type { ExamSection, ExamSectionQuestion, ExamSectionQuestionOption, Question } from '../../exam.model';

@Component({
    selector: 'xm-section-question',
    templateUrl: './section-question.component.html',
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

    constructor(
        private http: HttpClient,
        private modal: NgbModal,
        private translate: TranslateService,
        private toast: ToastrService,
        private Confirmation: ConfirmationDialogService,
        private Question: QuestionService,
        private Attachment: AttachmentService,
        private Files: FileService,
    ) {}

    calculateWeightedMaxPoints = () => this.Question.calculateWeightedMaxPoints(this.sectionQuestion);

    getCorrectClaimChoiceOptionScore = () => this.Question.getCorrectClaimChoiceOptionScore(this.sectionQuestion);

    getMinimumOptionScore = () => this.Question.getMinimumOptionScore(this.sectionQuestion);

    editQuestion = () => this.openExamQuestionEditor();

    downloadQuestionAttachment = () => {
        if (this.collaborative) {
            this.Attachment.downloadCollaborativeQuestionAttachment(this.examId, this.sectionQuestion);
        }
        this.Attachment.downloadQuestionAttachment(this.sectionQuestion.question);
    };

    removeQuestion = () =>
        this.Confirmation.open$(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_remove_question'),
        ).subscribe({ next: () => this.removed.emit(this.sectionQuestion), error: (err) => this.toast.error(err) });

    copyQuestion = () =>
        this.Confirmation.open$(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_copy_question'),
        ).subscribe({ next: () => this.copied.emit(this.sectionQuestion), error: (err) => this.toast.error(err) });

    determineClaimOptionType(examOption: ExamSectionQuestionOption) {
        return this.Question.determineClaimOptionTypeForExamQuestionOption(examOption);
    }

    private getQuestionDistribution(): Observable<boolean> {
        if (this.collaborative) {
            return of(false);
        }
        return this.http
            .get<{ distributed: boolean }>(`/app/exams/question/${this.sectionQuestion.id}/distribution`)
            .pipe(map((resp) => resp.distributed));
    }

    private openExamQuestionEditor = () =>
        this.getQuestionDistribution().subscribe((distributed) => {
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
        const modal = this.modal.open(BaseQuestionEditorComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'xl',
        });
        modal.componentInstance.lotteryOn = this.lotteryOn;
        modal.componentInstance.questionDraft = { ...this.sectionQuestion.question, examSectionQuestions: [] };
        modal.componentInstance.collaborative = this.collaborative;
        modal.componentInstance.examId = this.examId;
        modal.componentInstance.sectionQuestion = this.sectionQuestion;
        modal.componentInstance.questionId = this.sectionQuestion.question.id || 0;
        from(modal.result).subscribe({
            next: (question: Question) => {
                const resource = `/app/exams/${this.examId}/sections/${this.section.id}/questions/${this.sectionQuestion.id}`;
                this.http
                    .put<ExamSectionQuestion>(this.getResource(resource), {
                        question: question,
                    })
                    .subscribe({
                        next: (resp) => {
                            this.sectionQuestion = {
                                ...mergeDeepRight(this.sectionQuestion, resp),
                            } as ExamSectionQuestion;
                            this.updated.emit(this.sectionQuestion);
                            // Collaborative exam question handling.
                            if (!this.collaborative) {
                                return;
                            }
                            const attachment = question.attachment;
                            if (!attachment) {
                                return;
                            }
                            if (attachment.modified && attachment.file) {
                                this.Files.upload(
                                    '/app/iop/collab/attachment/question',
                                    attachment.file,
                                    { examId: this.examId.toString(), questionId: this.sectionQuestion.id.toString() },
                                    this.sectionQuestion.question,
                                );
                            } else if (attachment.removed) {
                                this.Attachment.eraseCollaborativeQuestionAttachment(
                                    this.examId,
                                    this.sectionQuestion.id,
                                ).then(() => {
                                    delete this.sectionQuestion.question.attachment;
                                });
                            }
                        },
                        error: (err) => this.toast.error(err),
                    });
            },
            error: (err) => this.toast.error(err),
        });
    };

    private openDistributedQuestionEditor = () => {
        const modal = this.modal.open(ExamQuestionEditorComponent, {
            backdrop: 'static',
            keyboard: true,
            windowClass: 'question-editor-modal',
            size: 'xl',
        });
        modal.componentInstance.examQuestion = { ...this.sectionQuestion };
        modal.componentInstance.lotteryOn = this.lotteryOn;
        modal.result
            .then((data: { question: Question; examQuestion: ExamSectionQuestion }) => {
                this.Question.updateDistributedExamQuestion$(
                    data.question,
                    data.examQuestion,
                    this.examId,
                    this.section.id,
                ).subscribe({
                    next: (esq: ExamSectionQuestion) => {
                        this.toast.info(this.translate.instant('sitnet_question_saved'));
                        // apply changes back to scope
                        this.sectionQuestion = { ...mergeDeepRight(this.sectionQuestion, esq) } as ExamSectionQuestion;
                        this.updated.emit(this.sectionQuestion);
                    },
                    error: (err) => this.toast.error(err),
                });
            })
            .catch(noop);
    };
}

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
import * as _ from 'lodash';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import * as toast from 'toastr';

import { BaseQuestionEditorComponent } from '../../../question/examquestion/baseQuestionEditor.component';
import { ExamQuestionEditorComponent } from '../../../question/examquestion/examQuestionEditor.component';
import { QuestionService } from '../../../question/question.service';
import { AttachmentService } from '../../../utility/attachment/attachment.service';
import { ConfirmationDialogService } from '../../../utility/dialogs/confirmationDialog.service';
import { FileService } from '../../../utility/file/file.service';
import { ExamSection, ExamSectionQuestion, ExamSectionQuestionOption, Question } from '../../exam.model';

@Component({
    selector: 'section-question',
    template: require('./sectionQuestion.component.html'),
})
export class SectionQuestionComponent {
    @Input() sectionQuestion: ExamSectionQuestion;
    @Input() lotteryOn: boolean;
    @Input() collaborative: boolean;
    @Input() section: ExamSection;
    @Input() examId: number;
    @Output() onDelete = new EventEmitter<ExamSectionQuestion>();

    constructor(
        private http: HttpClient,
        private modal: NgbModal,
        private translate: TranslateService,
        private Confirmation: ConfirmationDialogService,
        private Question: QuestionService,
        private Attachment: AttachmentService,
        private Files: FileService,
    ) {}

    calculateMaxPoints = () => this.Question.calculateMaxPoints(this.sectionQuestion);

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
        this.Confirmation.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_remove_question'),
        ).result.then(() => this.onDelete.emit(this.sectionQuestion));

    private getQuestionDistribution(): Observable<boolean> {
        if (this.collaborative) {
            return of(false);
        }
        return this.http
            .get<{ distributed: boolean }>(`/app/exams/question/${this.sectionQuestion.id}/distribution`)
            .pipe(map(resp => resp.distributed));
    }

    private openExamQuestionEditor = () =>
        this.getQuestionDistribution().subscribe(distributed => {
            if (!distributed) {
                // If this is not distributed, treat it as a plain question (or at least trick the user to
                // believe so)
                this.openBaseQuestionEditor();
            } else {
                this.openDistributedQuestionEditor();
            }
        });

    private getResource = (url: string) =>
        this.collaborative ? url.replace('/app/exams/', '/integration/iop/exams/') : url;

    private openBaseQuestionEditor = () => {
        const modal = this.modal.open(BaseQuestionEditorComponent, {
            backdrop: 'static',
            keyboard: true,
        });
        modal.componentInstance.lotteryOn = this.lotteryOn;
        modal.componentInstance.questionDraft = { ...this.sectionQuestion.question, examSectionQuestions: [] };
        modal.componentInstance.collaborative = this.collaborative;
        modal.componentInstance.examId = this.examId;
        modal.componentInstance.sectionQuestion = this.sectionQuestion;
        modal.componentInstance.questionId = this.sectionQuestion.question.id || 0;
        modal.result.then((question: Question) => {
            const resource = `/app/exams/${this.examId}/sections/${this.section.id}/questions/${this.sectionQuestion.id}`;
            this.http
                .put<ExamSectionQuestion>(this.getResource(resource), {
                    question: question,
                })
                .subscribe(
                    resp => {
                        this.sectionQuestion = _.merge(this.sectionQuestion, resp);
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
                                '/integration/iop/attachment/question',
                                attachment.file,
                                { examId: this.examId, questionId: this.sectionQuestion.id },
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
                    resp => {
                        toast.error(resp.data);
                    },
                );
        });
    };

    private openDistributedQuestionEditor = () => {
        const modal = this.modal.open(ExamQuestionEditorComponent, {
            backdrop: 'static',
            keyboard: true,
            windowClass: 'question-editor-modal',
        });
        modal.componentInstance.examQuestion = { ...this.sectionQuestion };
        modal.componentInstance.lotteryOn = this.lotteryOn;
        modal.result.then((data: { question: Question; examQuestion: ExamSectionQuestion }) => {
            this.Question.updateDistributedExamQuestion(
                data.question,
                data.examQuestion,
                this.examId,
                this.section.id,
            ).then((esq: ExamSectionQuestion) => {
                toast.info(this.translate.instant('sitnet_question_saved'));
                // apply changes back to scope
                this.sectionQuestion = _.merge(this.sectionQuestion, esq);
            });
        });
    };

    determineClaimOptionType(examOption: ExamSectionQuestionOption) {
        return this.Question.determineClaimOptionTypeForExamQuestionOption(examOption);
    }
}

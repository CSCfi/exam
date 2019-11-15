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
import * as angular from 'angular';

import { ExamSectionQuestion, ReverseQuestion, Tag } from '../../exam/exam.model';
import { SessionService, User } from '../../session/session.service';
import { AttachmentService } from '../../utility/attachment/attachment.service';
import { QuestionDraft, QuestionService } from '../question.service';

export const QuestionBodyComponent: angular.IComponentOptions = {
    template: require('./questionBody.template.html'),
    bindings: {
        question: '<',
        currentOwners: '<',
        lotteryOn: '<',
        examId: '<',
        sectionQuestion: '<',
    },
    controller: class QuestionBodyController implements angular.IComponentController, angular.IOnInit {
        question: ReverseQuestion | QuestionDraft;
        currentOwners: User[];
        lotteryOn: boolean;
        examId: number;
        sectionQuestion: ExamSectionQuestion;

        isInPublishedExam: boolean;
        examNames: string[];
        sectionNames: string[];
        newOwner: { name: string };
        newOwnerTemplate: User;
        newType: { type: string };
        questionTypes: { type: string; name: string }[];

        constructor(
            private $http: angular.IHttpService,
            private Session: SessionService,
            private Attachment: AttachmentService,
            private Question: QuestionService,
        ) {}

        private init = () => {
            const sections = this.question.examSectionQuestions.map(esq => esq.examSection);
            const examNames = sections.map(s => {
                if (s.exam.state === 'PUBLISHED') {
                    this.isInPublishedExam = true;
                }
                return s.exam.name as string;
            });
            const sectionNames = sections.map(s => s.name);
            // remove duplicates
            this.examNames = examNames.filter((n, pos) => examNames.indexOf(n) === pos);
            this.sectionNames = sectionNames.filter((n, pos) => sectionNames.indexOf(n) === pos);
        };

        $onInit() {
            this.questionTypes = [
                { type: 'essay', name: 'sitnet_toolbar_essay_question' },
                { type: 'cloze', name: 'sitnet_toolbar_cloze_test_question' },
                { type: 'multichoice', name: 'sitnet_toolbar_multiplechoice_question' },
                { type: 'weighted', name: 'sitnet_toolbar_weighted_multiplechoice_question' },
                { type: 'claim', name: 'sitnet_toolbar_claim_choice_question' },
            ];

            this.init();
        }

        setQuestionType = () => {
            this.question.type = this.Question.getQuestionType(this.newType.type);
            this.init();
        };

        showWarning = () => this.examNames.length > 1;

        listQuestionOwners = (filter: unknown, criteria: string) =>
            this.$http
                .get('/app/users/question/owners/TEACHER', { params: { q: criteria } })
                .then(
                    (resp: angular.IHttpResponse<User[]>) =>
                        resp.data.filter(u => this.currentOwners.map(o => o.id).indexOf(u.id) === -1).slice(0, 15),
                    err => toastr.error(err.data),
                );

        setQuestionOwner = (user: User) =>
            // Using template to store the selected user
            (this.newOwnerTemplate = user);

        addQuestionOwner = () => {
            if (this.newOwnerTemplate && this.newOwnerTemplate.id) {
                this.currentOwners.push(this.newOwnerTemplate);

                // nullify input field and template
                delete this.newOwner.name;
                delete this.newOwnerTemplate;
            }
        };

        removeOwnerDisabled = (user: User) =>
            this.currentOwners.length === 1 || (this.question.state === 'NEW' && this.Session.getUser().id === user.id);

        removeOwner = (user: User) => {
            if (this.removeOwnerDisabled(user)) {
                return;
            }
            this.currentOwners.splice(this.currentOwners.indexOf(user), 1);
        };

        selectFile = () =>
            this.Attachment.selectFile(true).then(data => {
                this.question.attachment = {
                    ...this.question.attachment,
                    modified: true,
                    fileName: data.$value.attachmentFile.name,
                    size: data.$value.attachmentFile.size,
                    file: data.$value.attachmentFile,
                    removed: false,
                };
            });

        downloadQuestionAttachment = () => {
            if (this.question.attachment && this.question.attachment.externalId) {
                this.Attachment.downloadCollaborativeQuestionAttachment(this.examId, this.sectionQuestion);
                return;
            }
            this.Attachment.downloadQuestionAttachment(this.question);
        };

        removeQuestionAttachment = () => {
            if (this.question.attachment) {
                this.Attachment.removeQuestionAttachment(this.question);
            }
        };

        getFileSize = () => {
            if (this.question.attachment) {
                this.Attachment.getFileSize(this.question.attachment.size);
            }
        };

        hasUploadedAttachment = () => {
            const a = this.question.attachment;
            return a && (a.id || a.externalId);
        };

        updateEvaluationType = () => {
            if (this.question.defaultEvaluationType === 'Selection') {
                delete this.question.defaultMaxScore;
            }
        };

        removeTag = (tag: Tag) => this.question.tags.splice(this.question.tags.indexOf(tag), 1);

        isUserAllowedToModifyOwners = () => {
            const user = this.Session.getUser();
            return (
                this.question.questionOwners &&
                (user.isAdmin || this.question.questionOwners.map(o => o.id).indexOf(user.id) > -1)
            );
        };
    },
};

angular.module('app.question').component('questionBody', QuestionBodyComponent);

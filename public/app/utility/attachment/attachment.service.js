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

'use strict';
angular.module('app.utility')
    .service('Attachment', ['$resource', '$uibModal', 'dialogs', '$translate', 'Files', 'toast',
        function ($resource, $modal, dialogs, $translate, Files, toast) {

            var questionAttachmentApi = $resource(
                '/app/attachment/question/:id',
                {
                    id: '@id'
                },
                {
                    'remove': {method: 'DELETE', params: {id: '@id'}}
                });
            var questionAnswerAttachmentApi = $resource(
                '/app/attachment/question/:qid/answer/:hash',
                {
                    qid: '@qid',
                    hash: '@hash'
                },
                {
                    'remove': {method: 'DELETE', params: {qid: '@qid', hash: '@hash'}}
                });
            var examAttachmentApi = $resource(
                '/app/attachment/exam/:id',
                {
                    id: '@id'
                },
                {
                    'remove': {method: 'DELETE', params: {id: '@id'}}
                });
            var feedbackAttachmentApi = $resource(
                '/app/attachment/exam/:id/feedback',
                {
                    id: '@id'
                },
                {
                    'remove': {method: 'DELETE', params: {eid: '@id'}}
                });
            var statementAttachmentApi = $resource(
                '/app/attachment/exam/:id/statement',
                {
                    id: '@id'
                },
                {
                    'remove': {method: 'DELETE', params: {eid: '@id'}}
                });


            var self = this;

            self.removeQuestionAttachment = function (question) {
                question.attachment.removed = true;
            };

            self.eraseQuestionAttachment = function (question) {
               return questionAttachmentApi.remove({id: question.id}).$promise;
            };

            self.removeQuestionAnswerAttachment = function (question, hash) {

                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_are_you_sure'));
                dialog.result.then(function (btn) {
                    questionAnswerAttachmentApi.remove({qid: question.id, hash: hash},
                        function (answer) {
                            toast.info($translate.instant('sitnet_attachment_removed'));
                            question.essayAnswer.objectVersion = answer.objectVersion;
                            delete question.essayAnswer.attachment;
                        }, function (error) {
                            toast.error(error.data);
                        });
                });
            };

            self.removeExamAttachment = function (exam) {

                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_are_you_sure'));
                dialog.result.then(function (btn) {
                    examAttachmentApi.remove({id: exam.id},
                        function () {
                            toast.info($translate.instant('sitnet_attachment_removed'));
                            exam.attachment = null;
                        }, function (error) {
                            toast.error(error.data);
                        });
                });
            };

            self.removeFeedbackAttachment = function (exam) {

                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_are_you_sure'));
                dialog.result.then(function (btn) {
                    feedbackAttachmentApi.remove({id: exam.id},
                        function () {
                            toast.info($translate.instant('sitnet_attachment_removed'));
                            exam.examFeedback.attachment = null;
                        }, function (error) {
                            toast.error(error.data);
                        });
                });
            };

            self.removeStatementAttachment = function (exam) {

                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_are_you_sure'));
                dialog.result.then(function (btn) {
                    statementAttachmentApi.remove({id: exam.id},
                        function () {
                            toast.info($translate.instant('sitnet_attachment_removed'));
                            delete exam.languageInspection.statement.attachment;
                        }, function (error) {
                            toast.error(error.data);
                        });
                });
            };

            self.downloadQuestionAttachment = function (question) {
                if (question.attachment.id) {
                    Files.download('/app/attachment/question/' + question.id, question.attachment.fileName);
                }
            };

            self.downloadQuestionAnswerAttachment = function (question, hash) {
                Files.download('/app/attachment/question/' + question.id + '/answer/' + hash,
                    question.essayAnswer.attachment.fileName);
            };

            self.downloadExamAttachment = function (exam) {
                Files.download('/app/attachment/exam/' + exam.id, exam.attachment.fileName);
            };

            self.downloadFeedbackAttachment = function (exam) {
                Files.download('/app/attachment/exam/' + exam.id + '/feedback', exam.examFeedback.attachment.fileName);
            };

            self.downloadStatementAttachment = function (exam) {
                Files.download('/app/attachment/exam/' + exam.id + '/statement', exam.languageInspection.statement.attachment.fileName);
            };

            self.getFileSize = function (attachment) {
                return attachment ? Math.round(attachment.size / 1000) + ' kB' : null;
            };

            self.selectFile = function (isTeacherModal, resolve) {
                var resolution = angular.extend({}, resolve);
                resolution.isTeacherModal = isTeacherModal;
                return $modal.open({
                    backdrop: 'static',
                    keyboard: true,
                    animation: true,
                    component: 'attachmentSelector',
                    resolve: resolution
                }).result;
            };


        }
    ]);


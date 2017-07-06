'use strict';
angular.module('app.utility')
    .service('Attachment', ['$uibModal', 'dialogs', '$translate', 'AttachmentRes', 'fileService',
        function ($modal, dialogs, $translate, AttachmentRes, fileService) {

            var self = this;

            self.removeQuestionAttachment = function (question) {
                question.attachment.removed = true;
            };

            self.removeQuestionAnswerAttachment = function (question, hash) {

                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_are_you_sure'));
                dialog.result.then(function (btn) {
                    AttachmentRes.questionAnswerAttachment.remove({qid: question.id, hash: hash},
                        function (answer) {
                            toastr.info($translate.instant('sitnet_attachment_removed'));
                            question.essayAnswer.objectVersion = answer.objectVersion;
                            delete question.essayAnswer.attachment;
                        }, function (error) {
                            toastr.error(error.data);
                        });
                });
            };

            self.removeExamAttachment = function (exam) {

                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_are_you_sure'));
                dialog.result.then(function (btn) {
                    AttachmentRes.examAttachment.remove({id: exam.id},

                        function () {
                            toastr.info($translate.instant('sitnet_attachment_removed'));
                            exam.attachment = null;
                        }, function (error) {
                            toastr.error(error.data);
                        });
                });
            };

            self.removeFeedbackAttachment = function (exam) {

                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_are_you_sure'));
                dialog.result.then(function (btn) {
                    AttachmentRes.feedbackAttachment.remove({id: exam.id},

                        function () {
                            toastr.info($translate.instant('sitnet_attachment_removed'));
                            exam.examFeedback.attachment = null;
                        }, function (error) {
                            toastr.error(error.data);
                        });
                });
            };

            self.removeStatementAttachment = function (exam) {

                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_are_you_sure'));
                dialog.result.then(function (btn) {
                    AttachmentRes.statementAttachment.remove({id: exam.id},
                        function () {
                            toastr.info($translate.instant('sitnet_attachment_removed'));
                            delete exam.languageInspection.statement.attachment;
                        }, function (error) {
                            toastr.error(error.data);
                        });
                });
            };

            self.downloadQuestionAttachment = function (question) {
                if (question.attachment.id) {
                    fileService.download('/app/attachment/question/' + question.id, question.attachment.fileName);
                }
            };

            self.downloadQuestionAnswerAttachment = function (question, hash) {
                fileService.download('/app/attachment/question/' + question.id + '/answer/' + hash,
                    question.essayAnswer.attachment.fileName);
            };

            self.downloadExamAttachment = function (exam) {
                fileService.download('/app/attachment/exam/' + exam.id, exam.attachment.fileName);
            };

            self.downloadFeedbackAttachment = function (exam) {
                fileService.download('/app/attachment/exam/' + exam.id + '/feedback', exam.examFeedback.attachment.fileName);
            };

            self.downloadStatementAttachment = function (exam) {
                fileService.download('/app/attachment/exam/' + exam.id + '/statement', exam.languageInspection.statement.attachment.fileName);
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


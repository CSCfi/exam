(function() {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('AttachmentController', ['dialogs', '$scope', '$translate', 'fileService', 'AttachmentRes',
            function(dialogs, $scope, $translate, fileService, AttachmentRes) {

            $scope.removeQuestionAttachment = function(question) {

                var dialog = dialogs.confirm($translate('sitnet_confirm'), $translate("sitnet_are_you_sure"));
                dialog.result.then(function (btn) {
                    AttachmentRes.questionAttachment.remove({id: question.id},

                        function() {
                            toastr.info($translate("sitnet_attachment_removed"));
                            question.attachment = null;
                        }, function(error) {
                            toastr.error(error.data);
                        });
                });
            };

            $scope.removeQuestionAnswerAttachment = function(question, hash) {

                var dialog = dialogs.confirm($translate('sitnet_confirm'), $translate("sitnet_are_you_sure"));
                dialog.result.then(function (btn) {
                    AttachmentRes.questionAnswerAttachment.remove({qid: question.id, hash: hash},

                        function() {
                            toastr.info($translate("sitnet_attachment_removed"));
                            question.answer.attachment = null;

                        }, function(error) {
                            toastr.error(error.data);
                        });
                });
            };

            $scope.removeExamAttachment = function(exam) {

                var dialog = dialogs.confirm($translate('sitnet_confirm'), $translate("sitnet_are_you_sure"));
                dialog.result.then(function (btn) {
                    AttachmentRes.examAttachment.remove({id: exam.id},

                        function() {
                            toastr.info($translate("sitnet_attachment_removed"));
                            exam.attachment = null;
                        }, function(error) {
                            toastr.error(error.data);
                        });
                });
            };

            $scope.downloadQuestionAttachment = function(question) {
                fileService.download('/attachment/question/' + question.id, question.attachment.fileName);
            };

            $scope.downloadQuestionAnswerAttachment = function(question, hash) {
                fileService.download('/attachment/question/' + question.id + '/answer/' + hash,
                    question.answer.attachment.fileName);
            };

            $scope.downloadExamAttachment = function(exam) {
                fileService.download('/attachment/exam/' + exam.id, exam.attachment.fileName);
            };

        }]);
}());
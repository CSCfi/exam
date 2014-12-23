(function() {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('AttachmentController', ['$scope', '$translate', '$location', '$http', 'AttachmentRes', function($scope, $translate, $location, $http, AttachmentRes) {


            $scope.removeQuestionAttachment = function(question) {

                if (confirm($translate("sitnet_are_you_sure"))) {
                    AttachmentRes.questionAttachment.remove({id: question.id},

                        function() {
                            toastr.info($translate("sitnet_attachment_removed"));
                            question.attachment = null;
                        }, function(error) {
                            toastr.error(error.data);
                        });
                }
            };

            $scope.removeQuestionAnswerAttachment = function(question, hash) {

                if (confirm($translate("sitnet_are_you_sure"))) {
                    AttachmentRes.questionAnswerAttachment.remove({qid: question.id, hash: hash},

                        function() {
                            toastr.info($translate("sitnet_attachment_removed"));
                            question.attachment = null;

                        }, function(error) {
                            toastr.error(error.data);
                        });
                }
            };

            $scope.removeExamAttachment = function(exam) {

                if (confirm($translate("sitnet_are_you_sure"))) {
                    AttachmentRes.examAttachment.remove({id: exam.id},

                        function() {
                            toastr.info($translate("sitnet_attachment_removed"));
                            exam.attachment = null;
                            //$location.path("/exams");
                        }, function(error) {
                            toastr.error(error.data);
                        });
                }
            };

            function saveFile(data, filename) {
                var byteString = atob(data);
                var ab = new ArrayBuffer(byteString.length);
                var ia = new Uint8Array(ab);
                for (var i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                var blob = new Blob([ia], {type: "application/octet-stream"});
                saveAs(blob, filename);
            }

            $scope.downloadQuestionAttachment = function(question) {

                $http.get('/attachment/question/' + question.id, {responseType: 'arrayBuffer'}).
                    success(function(data) {
                        saveFile(data, question.attachment.fileName);
                    }, function(error) {
                        toastr.error(error.data);
                    });
            };

            $scope.downloadQuestionAnswerAttachment = function(question, hash) {

                $http.get('/attachment/question/' + question.id + '/answer/' + hash, {responseType: 'arrayBuffer'}).
                    success(function(data) {
                        saveFile(data, question.answer.attachment.fileName);
                    }, function(error) {
                        toastr.error(error.data);
                    });
            };

            $scope.downloadExamAttachment = function(exam) {
                $http.get('/attachment/exam/' + exam.id, {responseType: 'arrayBuffer'}).
                    success(function(data) {
                        saveFile(data, exam.attachment.fileName);
                    }, function(error) {
                        toastr.error(error.data);
                    });
            };


        }]);
}());
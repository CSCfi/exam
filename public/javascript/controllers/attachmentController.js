(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('AttachmentController', ['$scope', '$translate', '$location', '$http', 'AttachmentRes', function ($scope, $translate, $location, $http, AttachmentRes) {


            $scope.removeQuestionAttachment = function (question) {

                if (confirm($translate("sitnet_are_you_sure"))) {
                    AttachmentRes.questionAttachment.remove({id: question.id},

                        function () {
                            toastr.info($translate("sitnet_attachment_removed"));
                            question.attachment = null;
                        }, function (error) {
                            toastr.error(error.data);
                        });
                }
            };

            $scope.removeQuestionAnswerAttachment = function (question, hash) {

                if (confirm($translate("sitnet_are_you_sure"))) {
                    AttachmentRes.questionAnswerAttachment.remove({qid: question.id, hash: hash},

                        function () {
                            toastr.info($translate("sitnet_attachment_removed"));
                            question.attachment = null;

                        }, function (error) {
                            toastr.error(error.data);
                        });
                }
            };

            $scope.downloadQuestionAttachment = function (question) {

            $http({method: 'GET', url: '/attachment/question/' + question.id}).
                success(function(data) {

                        var element = angular.element('<a/>');
                        element.attr({
                            href: 'data:application/octet-stream;charset=utf-8; base64,' + encodeURI(data),
                            target: '_blank',
                            download: question.attachment.fileName
                        })[0].click();

                    }, function (error) {
                        toastr.error(error.data);
                    });
            };

            $scope.downloadQuestionAnswerAttachment = function (question, hash) {

                $http({method: 'GET', url: '/attachment/question/' + question.id + '/answer/' + hash}).
                    success(function(data) {

                        var element = angular.element('<a/>');
                        element.attr({
                            href: 'data:application/octet-stream;charset=utf-8; base64,' + encodeURI(data),
                            target: '_blank',
                            download: question.answer.attachment.fileName
                        })[0].click();

                    }, function (error) {
                        toastr.error(error.data);
                    });
            };

            $scope.removeExamAttachment = function (exam) {

                if (confirm($translate("sitnet_are_you_sure"))) {
                    AttachmentRes.examAttachment.remove({id: exam.id},

                        function () {
                            toastr.info($translate("sitnet_attachment_removed"));
                            exam.attachment = null;
                            //$location.path("/exams");
                        }, function (error) {
                            toastr.error(error.data);
                        });
                }
            };

            $scope.downloadExamAttachment = function (exam) {

                $http({method: 'GET', url: '/attachment/exam/' + exam.id}).
                    success(function(data) {

                        var element = angular.element('<a/>');
                        element.attr({
                            href: 'data:application/octet-stream;charset=utf-8; base64,' + encodeURI(data),
                            target: '_blank',
                            download: exam.attachment.fileName
                        })[0].click();

                    }, function (error) {
                        toastr.error(error.data);
                    });
            };
        }]);
}());
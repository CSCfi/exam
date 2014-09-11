(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('AttachmentController', ['$scope', '$translate', '$location', '$http', 'AttachmentRes', function ($scope, $translate, $location, $http, AttachmentRes) {


            $scope.removeQuestionAttachment = function (question) {

                if (confirm("Oletko varma?")) {
                    AttachmentRes.questionAttachment.remove({id: question.id},

                        function () {
                            toastr.info("Liite poistettu.");
                            question.attachment = null;
                        }, function (error) {
                            toastr.error(error.data);
                        });
                }
            };

            $scope.downloadQuestionAttachment = function (question) {

            $http({method: 'GET', url: '/attachment/question/' + question.id}).
                success(function(data, status, headers, config) {

                        var element = angular.element('<a/>');
                        element.attr({
                            href: 'data:attachment;charset=utf-8; base64,' + encodeURI(data),
                            target: '_blank',
                            download: question.attachment.fileName
                        })[0].click();

                    }, function (error) {
                        toastr.error(error.data);
                    });
            };

            $scope.removeExamAttachment = function (exam) {

                if (confirm("Oletko varma?")) {
                    AttachmentRes.examAttachment.remove({id: exam.id},

                        function () {
                            toastr.info("Liite poistettu.");
                            exam.attachment = null;
                            //$location.path("/exams");
                        }, function (error) {
                            toastr.error(error.data);
                        });
                }
            };

            $scope.downloadExamAttachment = function (exam) {

                $http({method: 'GET', url: '/attachment/exam/' + exam.id}).
                    success(function(data, status, headers, config) {

                        var element = angular.element('<a/>');
                        element.attr({
                            href: 'data:attachment;charset=utf-8; base64,' + encodeURI(data),
                            target: '_blank',
                            download: exam.attachment.fileName
                        })[0].click();

                    }, function (error) {
                        toastr.error(error.data);
                    });
            };
        }]);
}());
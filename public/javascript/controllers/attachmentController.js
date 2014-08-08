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

                AttachmentRes.questionAttachment.get({id: question.id},
                    function (file) {
                        toastr.info("Liite ladattu.");
                        //window.location = question.attachment.fileName;
                        //$location.path("/questions/" + qid);
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

                AttachmentRes.examAttachment.get({id: exam.id},

                    function (file) {
                        toastr.info("Liite ladattu.");
                        //$location.path("/exams");
                    }, function (error) {
                        toastr.error(error.data);
                    });
            }

        }]);
}());
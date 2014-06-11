(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('AttachmentController', ['$scope', '$translate', '$location', '$http', 'AttachmentRes', function ($scope, $translate, $location,  $http, AttachmentRes) {


            $scope.removeQuestionAttachment = function(qid) {

                AttachmentRes.questionAttachment.remove({id: qid},

                    function () {
                        toastr.info("Liite poistettu.");
                        //$location.path("/exams");
                    }, function (error) {
                        toastr.error(error.data);
                    });
            }
            $scope.downloadQuestionAttachment = function(question) {

                AttachmentRes.questionAttachment.get({id: question.id},
                    function (file) {
                        toastr.info("Liite ladattu.");
                        //window.location = question.attachment.fileName;
                        //$location.path("/questions/" + qid);
                    }, function (error) {
                        toastr.error(error.data);
                    });
/*

                    $http({method: 'GET', url: 'attachment/question/' + question.id}).
                    success(function(data, status, headers, config) {

                        //window.open('data:text/csv;charset=utf-8,' + encodeURI(data));

                        var element = angular.element('<a/>');
                        element.attr({
                            href: 'data:' + question.attachment.mimeType +',' + encodeURI(data),
                            //href: 'ohje.pdf' + encodeURI(data),
                            target: '_blank',
                            download: question.attachment.fileName
                        })[0].click();

                    }).
                    error(function(data, status, headers, config) {
                        // if there's an error you should see it here
                    });
                    */
            }
            $scope.removeExamAttachment = function(qid) {

                AttachmentRes.examAttachment.remove({id: qid},

                    function () {
                        toastr.info("Liite poistettu.");
                        //$location.path("/exams");
                    }, function (error) {
                        toastr.error(error.data);
                    });
            }
            $scope.downloadExamAttachment = function(qid) {

                AttachmentRes.examAttachment.get({id: qid},

                    function () {
                        toastr.info("Liite ladattu.");
                        //$location.path("/exams");
                    }, function (error) {
                        toastr.error(error.data);
                    });
            }

        }]);
}());
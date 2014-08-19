(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ReportController', ['$scope', '$translate', '$location', '$http', 'SITNET_CONF', 'ReportResource', 'dateService',
            function ($scope, $translate, $location, $http, SITNET_CONF, ReportResource, dateService) {

                $scope.dateService = dateService;

                $scope.examRoomReservations = SITNET_CONF.TEMPLATES_PATH + "reports/exam-room-reservations.html";




                $scope.getReservations = function() {

                    ReportResource.resbydate.get({roomId: 1, from: '01.01.2014', to: '29.08.2014'},
                    function (data, status, headers, config) {
                        var element = angular.element('<a/>');
                        element.attr({
                            href: 'data:attachment/' + encodeURI(data),
                            target: '_blank',
                            download: 'filename.xlsx'
                        })[0].click();
                    }, function (error) {
                        toastr.error(error.data);
                    });

//                    $location.path("#/statistics/resbydate/1/01.01.2014/29.08.2014");

                };

//
//
//            $scope.removeQuestionAttachment = function (question) {
//
//                if (confirm("Oletko varma?")) {
//                    AttachmentRes.questionAttachment.remove({id: question.id},
//
//                        function () {
//                            toastr.info("Liite poistettu.");
//                            question.attachment = null;
//                        }, function (error) {
//                            toastr.error(error.data);
//                        });
//                }
//            };
//
//            $scope.downloadQuestionAttachment = function (question) {
//
//                AttachmentRes.questionAttachment.get({id: question.id},
//                    function (file) {
//                        toastr.info("Liite ladattu.");
//                        //window.location = question.attachment.fileName;
//                        //$location.path("/questions/" + qid);
//                    }, function (error) {
//                        toastr.error(error.data);
//                    });
//            };
//
//            $scope.removeExamAttachment = function (exam) {
//
//                if (confirm("Oletko varma?")) {
//                    AttachmentRes.examAttachment.remove({id: exam.id},
//
//                        function () {
//                            toastr.info("Liite poistettu.");
//                            exam.attachment = null;
//                            //$location.path("/exams");
//                        }, function (error) {
//                            toastr.error(error.data);
//                        });
//                }
//            };
//
//            $scope.downloadExamAttachment = function (exam) {
//
//                AttachmentRes.examAttachment.get({id: exam.id},
//
//                    function (file) {
//                        toastr.info("Liite ladattu.");
//                        //$location.path("/exams");
//                    }, function (error) {
//                        toastr.error(error.data);
//                    });
//            }

            }]);
}());
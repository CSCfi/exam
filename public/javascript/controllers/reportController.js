(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ReportController', ['$scope', '$translate', '$location', '$http', 'SITNET_CONF', 'ReportResource', 'RoomResource', 'dateService',
            function ($scope, $translate, $location, $http, SITNET_CONF, ReportResource, RoomResource, dateService) {

                $scope.dateService = dateService;

                $scope.examRoomReservations = SITNET_CONF.TEMPLATES_PATH + "reports/exam-room-reservations.html";
                $scope.examReport = SITNET_CONF.TEMPLATES_PATH + "reports/exam-report.html";

                $scope.selectedRoom = {
                    name: $translate("sitnet_choose")
                };

                $scope.rooms = RoomResource.rooms.query();
                $scope.examnames = ReportResource.examnames.query();


                $scope.setExam = function (exam) {
                    $scope.selectedExam = exam;
                }
                $scope.setRoom = function (room) {
                    $scope.selectedRoom = room;
                }

                $scope.getReservations = function() {

                    ReportResource.resbydate.get({roomId: $scope.selectedRoom.id, from: '01.01.2014', to: '29.08.2014'},
                    function (data) {

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
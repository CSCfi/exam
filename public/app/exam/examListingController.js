(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamListingController', ['dialogs', '$scope', 'sessionService', 'examService',
            '$routeParams', '$translate', '$http', '$location', 'EXAM_CONF', 'ExamRes',
            function (dialogs, $scope, sessionService, examService,
                      $routeParams, $translate, $http, $location, EXAM_CONF, ExamRes) {

                $scope.filter = {};
                $scope.loader = {
                    loading: false
                };

                $scope.user = sessionService.getUser();

                examService.listExecutionTypes().then(function (types) {
                    $scope.executionTypes = types;
                });

                var search = function () {
                    $scope.loader.loading = true;
                    ExamRes.exams.query({filter: $scope.filter.text}, function (exams) {
                        exams.forEach(function (e) {
                            e.ownerAggregate = e.examOwners.map(function (o) {
                                return o.firstName + " " + o.lastName;
                            }).join();
                            if (e.state === 'PUBLISHED') {
                                e.expired = Date.now() > new Date(e.examActiveEndDate);
                            } else {
                                e.expired = false;
                            }
                        });
                        $scope.exams = exams;
                        $scope.loader.loading = false;
                    }, function (err) {
                        $scope.loader.loading = false;
                        toastr.error($translate.instant(err.data));
                    });
                };

                $scope.search = function () {
                    search();
                };

                // Called when create exam button is clicked
                $scope.createExam = function (executionType) {
                    examService.createExam(executionType);
                };

                $scope.copyExam = function (exam, type) {
                    ExamRes.exams.copy({id: exam.id, type: type}, function (copy) {
                        toastr.success($translate.instant('sitnet_exam_copied'));
                        $location.path("/exams/" + copy.id);
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.deleteExam = function (exam) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_exam'));
                    dialog.result.then(function (btn) {
                        ExamRes.exams.remove({id: exam.id}, function (ex) {
                            toastr.success($translate.instant('sitnet_exam_removed'));
                            $scope.exams.splice($scope.exams.indexOf(exam), 1);

                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }, function (btn) {

                    });
                };

                $scope.getExecutionTypeTranslation = function (exam) {
                    return examService.getExecutionTypeTranslation(exam.executionType.type);
                };

                if ($scope.user.isTeacher) {
                    search();
                }

            }]);
}());

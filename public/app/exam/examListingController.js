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

                var search = function () {
                    $scope.loader.loading = true;
                    ExamRes.exams.query({filter: $scope.filter.text}, function (exams) {
                        exams.forEach(function (e) {
                            e.ownerAggregate = e.examOwners.map(function (o) {
                                return o.firstName + " " + o.lastName;
                            }).join();
                            e.stateOrd = ['PUBLISHED', 'SAVED', 'DRAFT'].indexOf(e.state);
                            if (e.stateOrd === 0 && Date.now() <= new Date(e.examActiveEndDate)) {
                                // There's a bug with bootstrap tables, contextual classes wont work together with
                                // striped-table. Therefore overriding the style with this (RGB taken from .success)
                                // https://github.com/twbs/bootstrap/issues/11728
                                e.activityStyle = {'background-color': '#dff0d8 !important'};
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

                $scope.copyExam = function (exam) {
                    ExamRes.exams.copy({id: exam.id}, function (copy) {
                        toastr.success($translate.instant('sitnet_exam_copied'));
                        $scope.exams.push(copy);
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

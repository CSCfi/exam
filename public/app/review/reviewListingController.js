(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ReviewListingController', ['$filter', 'dialogs', '$scope', '$q', '$route', '$routeParams',
            '$location', '$translate', 'ExamRes', 'dateService', 'examService', 'fileService', '$modal', 'EXAM_CONF',
            function ($filter, dialogs, $scope, $q, $route, $routeParams, $location, $translate, ExamRes, dateService,
                      examService, fileService, $modal, EXAM_CONF) {

                $scope.reviewPredicate = 'examReview.deadline';
                $scope.abortedPredicate = 'examReview.user.lastName';
                $scope.reverse = false;
                $scope.toggleLoggedReviews = false;
                $scope.toggleReviews = false;
                $scope.toggleGradedReviews = false;
                $scope.view = {filter: 'IN_PROGRESS'};

                $scope.pageSize = 10;

                $scope.go = function (exam) {
                    $location.path('/exams/review/' + exam.id);
                };

                $scope.translateGrade = function (exam) {
                    if (!exam.grade) {
                        return;
                    }
                    return examService.getExamGradeDisplayName(exam.grade.name);
                };

                ExamRes.exams.get({id: $routeParams.id}, function (exam) {
                    if (exam.course && exam.course.code) {
                        $scope.examInfo = exam.course.code + " " + exam.name;
                    } else {
                        $scope.examInfo = exam.name;
                    }
                });

                $scope.selectAll = function (selectAllCssClass, checkboxesCssClass) {

                    var isSelected = angular.element("." + selectAllCssClass).prop("checked");

                    angular.forEach(angular.element("." + checkboxesCssClass), function (input) {
                        angular.element(input).prop("checked", isSelected);
                    });
                };

                var getSelectedIds = function () {
                    // check that atleast one has been selected
                    var isEmpty = true,
                        boxes = angular.element(".gradedLoggedBox"),
                        ids = [];

                    angular.forEach(boxes, function (input) {
                        if (angular.element(input).prop("checked")) {
                            isEmpty = false;
                            ids.push(angular.element(input).val());
                        }
                    });

                    if (isEmpty) {
                        toastr.warning($translate.instant('sitnet_choose_atleast_one'));
                        return;
                    }
                    return {
                        "id": $routeParams.id,
                        "childIds": ids
                    };

                };

                $scope.archiveSelected = function () {

                    var selection = getSelectedIds().childIds.join();
                    ExamRes.archive.update({ids: selection}, function () {
                        $scope.gradedLoggedReviews = $scope.gradedLoggedReviews.filter(function (r) {
                            if (selection.indexOf(r.exam.id) !== -1) {
                                $scope.archivedReviews.push(r);
                                return false;
                            }
                            return true;
                        });
                        toastr.info($translate.instant('sitnet_exams_archived'));
                    });
                };

                $scope.printSelected = function () {

                    var selection = getSelectedIds();

                    fileService.download('/exam/record/export/' + selection.id,
                        $translate.instant("sitnet_grading_info") + '_' + $filter('date')(Date.now(), "dd-MM-yyyy") + '.csv',
                        {'childIds': selection.childIds});
                };

                $scope.sendSelectedToRegistry = function () {

                    var isEmpty = true,
                        boxes = angular.element(".gradedReviewsBox");

                    angular.forEach(boxes, function (input) {
                        if (angular.element(input).prop("checked")) {
                            isEmpty = false;
                        }
                    });

                    if (isEmpty) {
                        toastr.warning($translate.instant('sitnet_choose_atleast_one'));
                        return;
                    }

                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_record_review'));
                    dialog.result.then(function (btn) {

                        angular.forEach(boxes, function (input) {

                            var isSelected = angular.element(input).prop("checked");

                            if (isSelected) {

                                angular.forEach($scope.gradedReviews, function (review) {

                                    if (parseInt(angular.element(input).val()) === review.exam.id) {

                                        ExamRes.reviewerExam.get({eid: review.exam.id}, function (exam) {

                                            if ((exam.grade != undefined || exam.grade != "") || (exam.creditType != undefined || exam.creditType != "")) {

                                                var examToRecord = {
                                                    "id": exam.id,
                                                    "state": "GRADED_LOGGED",
                                                    "grade": exam.grade,
                                                    "customCredit": exam.customCredit,
                                                    "totalScore": exam.totalScore,
                                                    "creditType": exam.creditType,
                                                    "sendFeedback": true,
                                                    "answerLanguage": exam.answerLanguage,
                                                    "additionalInfo": ""
                                                };

                                                ExamRes.saveRecord.add(examToRecord, function () {
                                                    $route.reload();
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });

                        toastr.info($translate.instant('sitnet_results_send_ok'));

                    });
                };

                $scope.isNotInspector = function (teacher, inspections) {
                    var isNotInspector = true;
                    angular.forEach(inspections, function (inspection) {
                        if (inspection.user.id === teacher.id) {
                            isNotInspector = false;
                        }
                    });
                    return isNotInspector;
                };

                var handleOngoingReviews = function (review) {
                    ExamRes.inspections.get({id: review.exam.id}, function (inspections) {
                        review.inspections = inspections;
                    });
                    ExamRes.owners.get({id: review.exam.id},
                        function (examOwners) {
                            review.exam.examOwners = examOwners;
                        });
                };

                // Reviews
                ExamRes.examReviews.query({
                        eid: $routeParams.id,
                        statuses: ['ABORTED', 'REVIEW', 'REVIEW_STARTED', 'GRADED', 'GRADED_LOGGED', 'ARCHIVED']
                    },
                    function (reviews) {
                        reviews.forEach(function (r) {
                            r.duration = moment.utc(Date.parse(r.duration)).format('HH:mm');
                        });
                        $scope.abortedExams = reviews.filter(function (r) {
                            return r.exam.state === 'ABORTED';
                        });
                        $scope.examReviews = reviews.filter(function (r) {
                            return r.exam.state === 'REVIEW' || r.exam.state === 'REVIEW_STARTED';
                        });
                        $scope.examReviews.forEach(handleOngoingReviews);
                        $scope.toggleReviews = $scope.examReviews.length > 0;
                        $scope.gradedReviews = reviews.filter(function (r) {
                            return r.exam.state === 'GRADED';
                        });
                        $scope.toggleGradedReviews = $scope.gradedReviews.length > 0;
                        $scope.gradedLoggedReviews = reviews.filter(function (r) {
                            return r.exam.state === 'GRADED_LOGGED';
                        });
                        $scope.toggleLoggedReviews = $scope.gradedLoggedReviews.length > 0;
                        $scope.archivedReviews = reviews.filter(function (r) {
                            return r.exam.state === 'ARCHIVED';
                        });
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                // No-shows
                ExamRes.noShows.query({eid: $routeParams.id}, function (noShows) {
                    $scope.noShows = noShows;
                });

                $scope.isOwner = function (user, owners) {
                    var b = false;
                    if (owners) {
                        angular.forEach(owners, function (owner) {
                            if ((owner.firstName + " " + owner.lastName) === (user.firstName + " " + user.lastName)) {
                                b = true;
                            }
                        });
                    }
                    return b;
                };

                $scope.isInspector = function (user, inspections) {
                    var b = false;
                    if (inspections) {
                        angular.forEach(inspections, function (inspection) {
                            if ((inspection.user.firstName + " " + inspection.user.lastName) === (user.firstName + " " + user.lastName)) {
                                b = true;
                            }
                        });
                    }
                    return b;
                };

                $scope.isLongerThanSixMonths = function (gradedDate) {

                    var sixMonths = 1000 * 60 * 60 * 24 * 182;
                    var graded = Date.parse(gradedDate);

                    return new Date().getTime() > graded + sixMonths;
                };

                $scope.printExamCredit = function (courseCredit, customCredit) {
                    return customCredit && customCredit !== courseCredit ? customCredit : courseCredit;
                };

                $scope.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                $scope.toggleUnreviewed = function () {
                    if ($scope.examReviews && $scope.examReviews.length > 0) {
                        $scope.toggleReviews = !$scope.toggleReviews;
                    }
                };
                $scope.toggleGraded = function () {
                    if ($scope.gradedReviews && $scope.gradedReviews.length > 0) {
                        $scope.toggleGradedReviews = !$scope.toggleGradedReviews;
                    }
                };

                $scope.toggleLogged = function () {
                    if ($scope.gradedLoggedReviews && $scope.gradedLoggedReviews.length > 0) {
                        $scope.toggleLoggedReviews = !$scope.toggleLoggedReviews;
                    }
                };

                $scope.permitRetrial = function (reservation) {
                    ExamRes.reservation.update({id: reservation.id}, function () {
                        reservation.retrialPermitted = true;
                        toastr.info($translate.instant('sitnet_retrial_permitted'));
                    });
                };

                $scope.getAnswerAttachments = function () {

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'review/archive_download.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: function ($scope, $modalInstance) {
                            $scope.params = {};
                            $scope.ok = function () {
                                var start, end;
                                if ($scope.params.startDate) {
                                    start = moment($scope.params.startDate).format('DD.MM.YYYY');
                                }
                                if ($scope.params.endDate) {
                                    end = moment($scope.params.endDate).format('DD.MM.YYYY');
                                }
                                if (start && end && end < start) {
                                    toastr.error($translate.instant('sitnet_endtime_before_starttime'))
                                } else {
                                    $modalInstance.close({
                                        "start": start,
                                        "end": end
                                    });
                                }
                            };

                            $scope.cancel = function () {
                                $modalInstance.dismiss('cancel');
                            };
                        }
                    });

                    modalInstance.result.then(function (params) {
                        fileService.download(
                            '/exam/' + $routeParams.id + '/attachments', $routeParams.id + '.tar.gz', params);
                    })
                };


            }]);
}());

(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ReviewListingController', ['$filter', 'dialogs', '$scope', '$q', '$route', '$routeParams', '$location', '$translate', 'ExamRes', 'dateService', 'examService', 'fileService',
            function ($filter, dialogs, $scope, $q, $route, $routeParams, $location, $translate, ExamRes, dateService, examService, fileService) {

                $scope.reviewPredicate = 'examReview.deadline';
                $scope.abortedPredicate = 'examReview.user.lastName';
                $scope.reverse = false;
                $scope.toggleLoggedReviews = false;
                $scope.toggleReviews = false;
                $scope.toggleGradedReviews = false;
                $scope.showAborted = false;
                $scope.setShowAborted = function (value) {
                    $scope.showAborted = value;
                };

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
                    if(exam.course && exam.course.code) {
                        $scope.examInfo = exam.course.code + " " + exam.name;
                    } else {
                        $scope.examInfo = exam.name;
                    }
                });

                var parseDurations = function (reviews) {
                    angular.forEach(reviews, function (review) {
                        if (review.duration) {
                            review.duration = moment.utc(Date.parse(review.duration)).format('HH:mm');
                        }
                    });
                };

                $scope.selectAll = function (selectAllCssClass, checkboxesCssClass) {

                    var isSelected = angular.element("." + selectAllCssClass).prop("checked");

                    angular.forEach(angular.element("." + checkboxesCssClass), function (input) {
                        angular.element(input).prop("checked", isSelected);
                    });
                };

                $scope.printSelected = function() {

                    // check that atleast one has been selected
                    var isEmpty = true,
                        boxes = angular.element(".printToFileBox"),
                        ids = [];

                    angular.forEach(boxes, function (input) {
                        if (angular.element(input).prop("checked")) {
                            isEmpty = false;
                            ids.push(angular.element(input).val());
                        }
                    });

                    if (isEmpty) {
                        toastr.warning($translate('sitnet_choose_atleast_one'));
                        return;
                    }
                    // print to file
                    var examsToPrint = {
                        "id": $routeParams.id,
                        "childIds": ids
                    };

                    fileService.download('/exam/record/export/' + examsToPrint.id,
                        $translate("sitnet_grading_info") + '_' + $filter('date')(Date.now(), "dd-MM-yyyy") + '.csv',
                        {'childIds': ids});
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
                        toastr.warning($translate('sitnet_choose_atleast_one'));
                        return;
                    }

                    var dialog = dialogs.confirm($translate('sitnet_confirm'), $translate('sitnet_confirm_record_review'));
                    dialog.result.then(function (btn) {

                        var promises = [];

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

                        toastr.info($translate('sitnet_results_send_ok'));

                    });
                };

                $scope.isNotInspector = function(teacher, inspections) {
                    var isNotInspector = true;
                    angular.forEach(inspections, function(inspection){
                        if(inspection.user.id === teacher.id) {
                            isNotInspector = false;
                        }
                    });
                    return isNotInspector;
                };

                // Aborted exams
                ExamRes.examReviews.query({eid: $routeParams.id, statuses: ['ABORTED']},
                    function (abortedExams) {
                        angular.forEach(abortedExams, function (aborted) {
                            if (aborted.duration) {
                                aborted.duration = moment.utc(Date.parse(aborted.duration)).format('HH:mm');
                            }
                        });
                        $scope.abortedExams = abortedExams;
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );
                ExamRes.examReviews.query({eid: $routeParams.id, statuses: ['REVIEW', 'REVIEW_STARTED']},
                    function (examReviews) {
                        if (examReviews && examReviews.length > 0) {
                            $scope.toggleReviews = true;
                        }
                        angular.forEach(examReviews, function (review) {
                            if (review.duration) {
                                review.duration = moment.utc(Date.parse(review.duration)).format('HH:mm');
                            }
                            ExamRes.inspections.get({id: review.exam.id}, function (inspections) {
                                review.inspections = inspections;
                            });
                            ExamRes.owners.get({id: review.exam.id},
                                function (examOwners) {
                                    review.exam.examOwners = examOwners;
                                },
                                function (error) {

                                });
                        });
                        $scope.examReviews = examReviews;
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                $scope.isOwner = function(user, owners) {
                    var b = false;
                    if(owners) {
                        angular.forEach(owners, function(owner){
                            if((owner.firstName + " " + owner.lastName) === (user.firstName + " " + user.lastName)) {
                                b = true;
                            }
                        });
                    }
                    return b;
                };

                $scope.isInspector = function(user, inspections) {
                    var b = false;
                    if(inspections) {
                        angular.forEach(inspections, function(inspection){
                            if((inspection.user.firstName + " " + inspection.user.lastName) === (user.firstName + " " + user.lastName)) {
                                b = true;
                            }
                        });
                    }
                    return b;
                };

                // Graded exams
                ExamRes.examReviews.query({eid: $routeParams.id, statuses: ['GRADED']},
                    function (examReviews) {
                        if (examReviews && examReviews.length > 0) {
                            $scope.toggleGradedReviews = true;
                        }
                        angular.forEach(examReviews, function (review) {
                            if (review.duration) {
                                review.duration = moment.utc(Date.parse(review.duration)).format('HH:mm');
                            }
                        });

                        $scope.gradedReviews = examReviews;
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                // Logged exams
                ExamRes.examReviews.query({eid: $routeParams.id, statuses: ['GRADED_LOGGED']},
                    function (examReviews) {
                        if (examReviews && examReviews.length > 0) {
                            $scope.toggleLoggedReviews = true;
                        }
                        $scope.gradedLoggedReviews = examReviews;
                        parseDurations($scope.gradedLoggedReviews);
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

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

            }]);
}());

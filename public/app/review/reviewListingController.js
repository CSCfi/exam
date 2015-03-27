(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ReviewListingController', ['$scope', '$q', '$route', '$routeParams', '$location', '$translate', 'ExamRes', 'dateService', 'examService',
            function ($scope, $q, $route, $routeParams, $location, $translate, ExamRes, dateService, examService) {

                $scope.reviewPredicate = 'examReview.deadline';
                $scope.reverse = false;
                $scope.toggleLoggedReviews = false;
                $scope.toggleReviews = false;
                $scope.toggleGradedReviews = false;

                $scope.pageSize = 10;

                $scope.go = function (exam) {
                    if (exam.state === 'ABORTED') {
                        alert($translate("sitnet_not_allowed_to_review_aborted_exam"));
                    } else {
                        $location.path('/exams/review/' + exam.id);
                    }
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

                    if (confirm($translate('sitnet_confirm_record_review'))) {

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

                    }
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

                // Unreviewed exams
                ExamRes.examReviews.query({eid: $routeParams.id, statuses: ['REVIEW', 'REVIEW_STARTED', 'ABORTED']},
                    function (examReviews) {
                        if (examReviews.length > 0) {
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

                // Graded exams
                ExamRes.examReviews.query({eid: $routeParams.id, statuses: ['GRADED']},
                    function (examReviews) {
                        if (examReviews.length > 0) {
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
                        if (examReviews.length > 0) {
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
                    if ($scope.examReviews.length > 0) {
                        $scope.toggleReviews = !$scope.toggleReviews;
                    }
                };
                $scope.toggleGraded = function () {
                    if ($scope.gradedReviews.length > 0) {
                        $scope.toggleGradedReviews = !$scope.toggleGradedReviews;
                    }
                };

                $scope.toggleLogged = function () {
                    if ($scope.gradedLoggedReviews.length > 0) {
                        $scope.toggleLoggedReviews = !$scope.toggleLoggedReviews;
                    }
                };

            }]);
}());

(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ReviewListingController', ['$scope', '$routeParams', '$location', '$translate', 'ExamRes', 'dateService',
            function ($scope, $routeParams, $location, $translate, ExamRes, dateService) {

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

                ExamRes.exams.get({id: $routeParams.id}, function(exam) {
                    $scope.examInfo = exam.course.code + " " + exam.name;
                });

                var parseDurations= function (reviews) {
                    angular.forEach(reviews, function (review) {
                        if (review.duration) {
                            review.duration = moment.utc(Date.parse(review.duration)).format('HH:mm');
                        }
                    });
                };

                // Unreviewed exams
                ExamRes.examReviews.query({eid: $routeParams.id, statuses: ['REVIEW', 'REVIEW_STARTED', 'ABORTED']},
                    function (examReviews) {
                        if (examReviews.length > 0) {
                            $scope.toggleReviews = true;
                        }
                        angular.forEach(examReviews, function(review) {
                            if (review.duration) {
                                review.duration = moment.utc(Date.parse(review.duration)).format('HH:mm');
                            }
                            ExamRes.inspections.get({id: review.exam.id}, function (inspections) {
                                review.inspections = inspections;
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
                        angular.forEach(examReviews, function(review) {
                            if (review.duration) {
                                review.duration = moment.utc(Date.parse(review.duration)).format('HH:mm');
                            }
                            ExamRes.inspections.get({id: review.exam.id}, function (inspections) {
                                review.inspections = inspections;
                            });
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

                $scope.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                $scope.toggleUnreviewed = function() {
                    $scope.toggleReviews = !$scope.toggleReviews;
                };
                $scope.toggleGraded = function() {
                    $scope.toggleGradedReviews = !$scope.toggleGradedReviews;
                };

                $scope.toggleLogged = function() {
                    $scope.toggleLoggedReviews = !$scope.toggleLoggedReviews;
                };

            }]);
}());

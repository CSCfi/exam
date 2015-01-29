(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ReviewListingController', ['$scope', '$routeParams', '$location', '$translate', 'ExamRes', 'dateService',
            function ($scope, $routeParams, $location, $translate, ExamRes, dateService) {

                $scope.examLocalInspections = {};

                $scope.toggleReviewExams = false;
                $scope.go = function (location) {
                    $location.path(location);
                };

                $scope.toggleGradedExams = false;
                $scope.toggleLoggedExams = false;

                $scope.getExamInfo = function () {
                    if ($scope.examReviews && $scope.examReviews.length > 0) {
                        return $scope.examReviews[0].exam.course.code + " " + $scope.examReviews[0].exam.name;
                    } else {
                        return $translate('sitnet_no_participations_for_exam');
                    }
                };


                ExamRes.examReviews.query({eid: $routeParams.id},
                    function (examReviews) {
                        $scope.examReviews = examReviews;

                        angular.forEach($scope.examReviews, function (review) {

                            if (review && review.duration) {
                                review.duration = moment.utc(Date.parse(review.duration)).format('HH:mm');
                            }
                            if (review.exam.state === "REVIEW" || review.exam.state === "ABORTED" || review.exam.state === "REVIEW_STARTED") {
                                $scope.toggleReviewExams = true;
                            }
                            if (review.exam.state === "GRADED") {
                                $scope.toggleGradedExams = true;
                            }
                            if (review.exam.state === "GRADED_LOGGED") {
                                $scope.toggleLoggedExams = true;
                            }

                            ExamRes.inspections.get({id: review.exam.id},
                                function (locals) {
                                    $scope.examLocalInspections[review.exam.id] = locals;
                                },
                                function (error) {
                                    toastr.error(error.data);
                                }
                            );
                        });
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );


                $scope.reviewPredicate = 'examReview.deadline';
                $scope.reverse = false;

                $scope.isLongerThanSixMonths = function (gradedDate) {

                    var sixMonths = 1000 * 60 * 60 * 24 * 182;
                    var graded = Date.parse(gradedDate);

                    return new Date().getTime() > graded + sixMonths;
                };

                $scope.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                $scope.getLocalInspection = function (eid) {
                    return $scope.examLocalInspections[eid];
                };

                $scope.isLocalReady = function (eid, userId) {
                    var ready = false;
                    if ($scope.examLocalInspections[eid] && $scope.examLocalInspections[eid].length > 0) {
                        angular.forEach($scope.examLocalInspections[eid], function (localInspection) {
                            if (localInspection.user.id && localInspection.user.id === userId) {
                                ready = localInspection.ready;
                            }
                        });
                    }
                    return ready;
                };

                $scope.byState = function (state) {
                    return function (examReview) {
                        return examReview.exam.state === state;
                    };
                };

                $scope.byStates = function (states) {
                    var b = false;
                    return function (examReview) {
                        angular.forEach(states, function (state) {
                            if (examReview.exam.state === state) {
                                b = true;
                            }
                        });
                        return b;
                    };
                };
            }]);
}());

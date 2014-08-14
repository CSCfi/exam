(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ReviewListingController', ['$scope', '$routeParams', '$location', '$translate', 'QuestionRes', 'sessionService', 'SITNET_CONF', 'ExamRes',
            function ($scope, $routeParams, $location, $translate, QuestionRes, sessionService, SITNET_CONF, ExamRes) {

//                $scope.questionListingMultipleChoice = SITNET_CONF.TEMPLATES_PATH + "question-listing/multiplechoice_questions.html";
//                $scope.questionListingEssay = SITNET_CONF.TEMPLATES_PATH + "question-listing/essay_questions.html";
//                $scope.questionTemplate = null;

                $scope.user = $scope.session.user;


                $scope.getExamInfo = function() {
                    if($scope.examReviews.length > 0){
                        var info = $scope.examReviews[0].exam.course.code +" "+ $scope.examReviews[0].exam.name;
                        return info;
                    }
                    else
                        return "Tentillä ei ole yhtään vastausta";
                }


                if ($routeParams.id === undefined)
                    $scope.examReviews = ExamRes.examsByState.query({state: 'REVIEW'});
                else {
                    ExamRes.examReviews.query({eid: $routeParams.id},
                        function (examReviews) {
                            $scope.examReviews = examReviews;
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                }


                $scope.byState = function(state) {
                    return function(examReview) {
                        return examReview.exam.state === state;
                    }
                };

            }]);
}());

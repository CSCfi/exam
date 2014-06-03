(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ReviewListingController', ['$scope', '$routeParams', '$location', '$translate', 'QuestionRes', 'sessionService', 'SITNET_CONF', 'ExamRes',
            function ($scope, $routeParams, $location, $translate, QuestionRes, sessionService, SITNET_CONF, ExamRes) {

//                $scope.questionListingMultipleChoice = SITNET_CONF.TEMPLATES_PATH + "question-listing/multiplechoice_questions.html";
//                $scope.questionListingEssay = SITNET_CONF.TEMPLATES_PATH + "question-listing/essay_questions.html";
//                $scope.questionTemplate = null;

                $scope.user = $scope.session.user;

                console.log($scope.user.id);

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



            }]);
}());

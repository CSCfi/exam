(function() {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('QuestionListingController', ['$scope', '$routeParams', '$location', '$translate', 'QuestionRes',
            function($scope, $routeParams, $location, $translate, QuestionRes) {


                $scope.questions = QuestionRes.questionlist.query({id: $scope.session.user.id});

                $scope.createQuestion = function(type) {
                    var newQuestion;
                    newQuestion = {
                        type: type,
                        question: $translate('sitnet_new_question_draft')
                    };

                    QuestionRes.questions.create(newQuestion,
                        function(response) {
                            toastr.info($translate('sitnet_question_added'));
                            $location.path("/questions/" + response.id);
                        }
                    );
                };

                $scope.deleteQuestion = function(question) {
                    if (confirm($translate('sitnet_remove_question'))) {
                        $scope.questions.splice($scope.questions.indexOf(question), 1);

                        QuestionRes.questions.delete({'id': question.id}, function() {
                            toastr.info($translate('sitnet_question_removed'));
                        });
                    }
                };

            }]);
}());

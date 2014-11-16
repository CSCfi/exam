(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('EssayReviewController', ['$scope', 'question', 'sessionService', '$sce', '$routeParams', '$http', '$modalInstance', '$location', '$translate', '$timeout', 'SITNET_CONF', 'ExamRes', 'QuestionRes',
            function ($scope, question, sessionService, $sce, $routeParams, $http, $modalInstance, $location, $translate, $timeout, SITNET_CONF, ExamRes, QuestionRes) {

                $scope.question = question;

                $scope.session = sessionService;
                $scope.user = $scope.session.user;


                $scope.insertEssayScore = function (question) {
                    var questionToUpdate = {
                        "id": question.id,
                        "type": question.type,
                        "expanded": question.expanded,
                        "evaluatedScore": question.evaluatedScore,
                        "maxScore": question.maxScore
                    };

                    QuestionRes.questions.update({id: questionToUpdate.id}, questionToUpdate, function (q) {
//                        question = q;
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.removeNewLines = function(answer) {
                    return answer ? answer.replace(/\n/g, '') : '';
                };

                $scope.scoreEssayAnswer = function (question) {
                    if (question.answer === null) {
                        question.evaluatedScore = 0;
                    }
                };

                $scope.range = function(min, max, step){
                    step = (step === undefined) ? 1 : step;
                    var input = [];
                    for (var i = min; i <= max; i += step) input.push(i);
                    return input;
                };

                $scope.getName = function(question) {

                    return question.type +"_"+  question.id;
                };

                $scope.ok = function (question) {
                    $scope.insertEssayScore(question);
                    $modalInstance.dismiss();
                };
                                // Cancel button is pressed in the modal dialog
                $scope.cancel = function () {
                    $modalInstance.dismiss('Canceled');
                };

        }]);
}());
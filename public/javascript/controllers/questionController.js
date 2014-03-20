(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('QuestionCtrl', ['$scope', '$routeParams', '$location', 'QuestionRes', '$translate', 'SITNET_CONF',
            function ($scope, $routeParams, $location, QuestionRes, $translate, SITNET_CONF) {

                $scope.newOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "question-editor/multiple_choice_option.html";
                $scope.multipleChoiseOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "question-editor/multiple_choice_question.html";
                $scope.essayQuestionTemplate = SITNET_CONF.TEMPLATES_PATH + "question-editor/essay_question.html";

                $scope.questionTemplate = null;


                $scope.questions = QuestionRes.query();


                if ($location.path() == '/questions/new') {
                    var newQuestion = {
                        type: "",
                        question: $translate("sitnet_question_write_name"),
                        instruction: "Kirjoita ohje tähän",
                        materials: [],
                        evaluationPhrases: [],
                        evaluationCriterias: [],
                        comments: []
                    };

                    $scope.newQuestion = newQuestion;
                }

                $scope.newMCQuestion = function () {
                    $scope.questionTemplate = $scope.multipleChoiseOptionTemplate;

                    $scope.newQuestion.type = "MultipleChoiceQuestion";

                    $scope.newQuestion.options =
                        [{
                            "option": "Esimerkki vaihtoehto",
                            "correctOption": false,
                            "score": 1
                        }];
                };

                $scope.newEssayQuestion = function () {
                    $scope.questionTemplate = $scope.essayQuestionTemplate;

                    $scope.newQuestion.type = "EssayQuestion";

                    // Sanan keskimääräinen pituus = 7.5 merkkiä
                    // https://www.cs.tut.fi/~jkorpela/kielikello/kirjtil.html
                    $scope.newQuestion.maxCharacters = 500;
                    $scope.newQuestion.words = Math.floor($scope.newQuestion.maxCharacters / 7.5);
                };

                $scope.estimateWords = function () {
                    $scope.newQuestion.words = Math.floor($scope.newQuestion.maxCharacters / 7.5);
                };



                $scope.saveQuestion = function () {

                    // TODO: first should check if question is saved ok on the server, then push to local
//                    $scope.questions.push(newQuestion);

                    QuestionRes.save($scope.newQuestion, function (newQuestion) {
                        toastr.info("Kysymys lisätty.");
                    });

                };

                $scope.deleteQuestion = function (question) {

                    if (confirm('Poistetaanko kysymys?')) {
                        $scope.questions.splice($scope.questions.indexOf(question), 1);

                        QuestionRes.delete({'id': question.id}), function () {
                            toastr.info("Kysymys poistettu.");
                        }
                    }
                }

                $scope.addNewOption = function (newQuestion) {
                    $scope.newQuestion.options.push({
//                        id: $scope.newQuestion.options.length + 1,
                        option: $translate("sitnet_option"),
                        correctOption: false,
                        score: 1
                    });
                };

                $scope.radioChecked = function (option) {
                    option.correctOption = true;

                    var checkbox = document.getElementById(option.id);
                    console.log("value " + checkbox.value);
                    console.log("name " + checkbox.name);
//                    console.log("id " + checkbox.id);
                    console.log(" ");

                    angular.forEach($scope.newQuestion.options, function (value, index) {
                        if (value.id != option.id)
                            value.correctOption = false;
                    })
                };

                $scope.removeOption = function (option) {
                    $scope.newQuestion.options.splice($scope.newQuestion.options.indexOf(option), 1);

                }
            }]);
}());

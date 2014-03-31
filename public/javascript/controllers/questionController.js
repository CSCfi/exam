(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('QuestionCtrl', ['$scope', '$routeParams', '$location', 'QuestionRes', '$translate', 'SITNET_CONF',
            function ($scope, $routeParams, $location, QuestionRes, $translate, SITNET_CONF) {

        		$scope.libraryTemplate = SITNET_CONF.TEMPLATES_PATH + "library/library.html";
                $scope.newOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "question-editor/multiple_choice_option.html";
                $scope.multipleChoiseOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "question-editor/multiple_choice_question.html";
                $scope.essayQuestionTemplate = SITNET_CONF.TEMPLATES_PATH + "question-editor/essay_question.html";

                $scope.questionTemplate = null;

                $scope.questionTypes = {
                    MultipleChoiceQuestion: 'Monivalinta yksi oikein',
                    EssayQuestion: 'Essee'
                };
                $scope.selectedType = false;


                $scope.setQuestionType = function () {
                    switch ($scope.selectedType) {
                        case 'EssayQuestion':
                            $scope.questionTemplate = $scope.essayQuestionTemplate;
                            $scope.newQuestion.type = "EssayQuestion";
                            // Sanan keskimääräinen pituus = 7.5 merkkiä
                            // https://www.cs.tut.fi/~jkorpela/kielikello/kirjtil.html
                            $scope.newQuestion.maxCharacters = 500;
                            $scope.newQuestion.words = Math.floor($scope.newQuestion.maxCharacters / 7.5);
                            break;

                        case 'MultipleChoiceQuestion':
                            $scope.questionTemplate = $scope.multipleChoiseOptionTemplate;
                            $scope.newQuestion.type = "MultipleChoiceQuestion";
//                            $scope.newQuestion.options = [
//                                {
//                                    "option": "Esimerkki vaihtoehto",
//                                    "correctOption": false,
//                                    "score": 1
//                                }
//                            ];
                            break;
                    }
                }

                if($routeParams.id === undefined)
                    $scope.questions = QuestionRes.questions.query();
                else
                {
                    QuestionRes.questions.get({id: $routeParams.id},
                        function (value) {
                            $scope.newQuestion = value;

                            $scope.selectedType = $scope.newQuestion.type;
                            $scope.setQuestionType();
                        },
                        function (error) {
                            // error
                        }
                    );
                }

                if ($location.path() == '/questions/new') {
                    var newQuestion = {
                        type: "",
                        question: $translate("sitnet_question_write_name"),
                        instruction: "",
                        materials: [],
                        evaluationPhrases: [],
                        evaluationCriterias: [],
                        comments: []
                    };

                    $scope.newQuestion = newQuestion;
                }

//                http://draptik.github.io/blog/2013/07/28/restful-crud-with-angularjs/
                $scope.createQuestion = function(type) {
                    QuestionRes.questions.create({type: type},
                        function (response) {
                            newQuestion.options.push(response);
                            toastr.info("Vaihtoehto lisätty");
                        }, function (error) {
                            toastr.error("Jokin meni pieleen");
                        }
                    );
                }

                $scope.newMCQuestion = function () {
                    $scope.questionTemplate = $scope.multipleChoiseOptionTemplate;
                    $scope.newQuestion.type = "MultipleChoiceQuestion";
                    $scope.newQuestion.options = [
                        {
                            "option": "Esimerkki vaihtoehto",
                            "correctOption": false,
                            "score": 1
                        }
                    ];
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

                    QuestionRes.questions.save($scope.newQuestion, function (newQuestion) {
                        toastr.info("Kysymys lisätty");
                    });
                };

                $scope.deleteQuestion = function (question) {
                    if (confirm('Poistetaanko kysymys?')) {
                        $scope.questions.splice($scope.questions.indexOf(question), 1);

                        QuestionRes.questions.delete({'id': question.id}), function () {
                            toastr.info("Kysymys poistettu");
                        };
                    }
                };

                $scope.addNewOption = function (newQuestion) {

//                    var option = {
//                        "option": "Esimerkki vaihtoehto",
//                        "correctOption": false,
//                        "score": 1
//                    };

                    QuestionRes.options.create(
                        function (response) {
                            newQuestion.options.push(response);
                            toastr.info("Vaihtoehto lisätty");
                        }, function (error) {
                            toastr.error("Jokin meni pieleen");
                        }
                    );

//                    $scope.newQuestion.options.push({
//                        option: $translate("sitnet_option"),
//                        correctOption: false,
//                        score: 1
//                    });
                };

                $scope.radioChecked = function (option) {
                    option.correctOption = true;

                    var checkbox = document.getElementById(option.id);

                    angular.forEach($scope.newQuestion.options, function (value, index) {
                        if (value.id != option.id)
                            value.correctOption = false;
                    })
                };

                $scope.removeOption = function (option) {
                    $scope.newQuestion.options.splice($scope.newQuestion.options.indexOf(option), 1);
                }

                $scope.editQuestion = function (question) {

                }

            }]);
}());

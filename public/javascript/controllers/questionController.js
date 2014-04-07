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
                            toastr.error(error.data);
                        }
                    );
                }


//                http://draptik.github.io/blog/2013/07/28/restful-crud-with-angularjs/
                $scope.createQuestion = function(type) {
                    var newQuestion = {
                        type: type,
                        question: $translate("sitnet_question_write_name")
                    }

                    QuestionRes.questions.create(newQuestion,
                        function (response) {
                            toastr.info("Kysymys lisätty");
                            $location.path("/questions/" + response.id);
                        }, function (error) {
                            toastr.error(error.data);
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

                    // common to all type of questions
                    var questionToUpdate = {
                        "id": $scope.newQuestion.id,
                        "type": $scope.newQuestion.type,
                        "score": $scope.newQuestion.score,
                        "question": $scope.newQuestion.question,
                        "shared": $scope.newQuestion.shared,
                        "instruction": $scope.newQuestion.instruction,
                        "evaluationCriterias": $scope.newQuestion.evaluationCriterias
                    }

                    // update question specific attributes
                    switch (questionToUpdate.type) {
                        case 'EssayQuestion':
                            questionToUpdate.maxCharacters = $scope.newQuestion.maxCharacters;
                            break;

                        case 'MultipleChoiceQuestion':

                            break;
                    }

                    QuestionRes.questions.update({id: $scope.newQuestion.id}, questionToUpdate,
                        function (responce) {
                            toastr.info("Kysymys tallennettu");
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );
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

                    var option = {
                        "option": "Esimerkki vaihtoehto",
                        "correctOption": false,
                        "score": 1
                    };

                    QuestionRes.options.create({qid: newQuestion.id}, option,
                        function (response) {
                            newQuestion.options.push(response);
                            toastr.info("Vaihtoehto lisätty");
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );
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

                    QuestionRes.options.delete({qid: null, oid: option.id},
                        function (response) {
                            $scope.newQuestion.options.splice($scope.newQuestion.options.indexOf(option), 1);
                            toastr.info("Vaihtoehto poistettu");
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );

                }

                $scope.editQuestion = function (question) {

                }

                $scope.updateOption = function (option) {
                    QuestionRes.options.update({oid: option.id}, option,
                        function (response) {
                            toastr.info("Oikea vaihtoehto päivitetty");
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );
                }

                $scope.correctAnswerToggled = function (optionId, newQuestion) {

                    angular.forEach(newQuestion.options, function (option) {
                        // This is the option that was clicked
                        if (option.id == optionId) {
                            // If the correct is false then switch it to true, otherwise do nothing
                            if (option.correctOption == false) {

                                option.correctOption = true;

                                QuestionRes.options.update({oid: optionId}, option,
                                    function (response) {
                                        toastr.info("Oikea vaihtoehto päivitetty");
                                    }, function (error) {
                                        toastr.error(error.data);
                                    }
                                );
//                                $scope.correctAnswer = {background: 'green'}
                            }
                        } else {
                            // Check for true values in other options than that was clicked and if found switch them to false
                            if (option.correctOption == true) {
                                option.correctOption = false;

                                QuestionRes.options.update({oid: optionId}, option,
                                    function (response) {
                                        toastr.info("Edellinen oikea vaihtoehto päivitetty");
                                    }, function (error) {
                                        toastr.error(error.data);
                                    }
                                );
//                                $scope.wrongAnswer = {background: 'grey'}
                            }
                        }
                    })

                    // Save changes to database

                }

            }]);
}());

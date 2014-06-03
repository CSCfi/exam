(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('QuestionCtrl', ['$scope', '$modal', '$routeParams', '$location', '$translate', 'QuestionRes', 'ExamRes', 'sessionService', 'SITNET_CONF',
            function ($scope, $modal, $routeParams, $location, $translate, QuestionRes, ExamRes, sessionService, SITNET_CONF) {

                $scope.libraryTemplate = SITNET_CONF.TEMPLATES_PATH + "library/library.html";
                $scope.newOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "question-editor/multiple_choice_option.html";
                $scope.multipleChoiseOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "question-editor/multiple_choice_question.html";
                $scope.essayQuestionTemplate = SITNET_CONF.TEMPLATES_PATH + "question-editor/essay_question.html";

                $scope.questionListingMultipleChoice = SITNET_CONF.TEMPLATES_PATH + "question-listing/multiplechoice_questions.html";
                $scope.questionListingEssay = SITNET_CONF.TEMPLATES_PATH + "question-listing/essay_questions.html";

                $scope.questionTemplate = null;
                $scope.returnURL = null;

                $scope.questionTypes = {
                    MultipleChoiceQuestion: 'Monivalinta yksi oikein',
                    EssayQuestion: 'Essee'
                };
                $scope.selectedType = false;

                $scope.answerState = "";

//                $scope.user = $scope.session.user;

//                console.log($scope.user.id);

                $scope.setQuestionType = function () {
                    switch ($scope.selectedType) {
                        case 'EssayQuestion':
                            $scope.questionTemplate = $scope.essayQuestionTemplate;
                            $scope.newQuestion.type = "EssayQuestion";
                            $scope.newQuestion.evaluationType = "Points";
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

                if ($routeParams.id === undefined)
                    $scope.questions = QuestionRes.questions.query();
                else {
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
                $scope.createQuestion = function (type) {
                    var newQuestion = {
                        type: type
//                        question: $translate("sitnet_question_write_name")
                    }

                    if ($routeParams.examId === undefined) {
                        QuestionRes.questions.create(newQuestion,
                            function (response) {
                                toastr.info("Kysymys lisätty");
                                $location.path("/questions/" + response.id);
                            }, function (error) {
                                toastr.error(error.data);
                            }
                        );
                    }
                    else {
                        QuestionRes.questions.create(newQuestion,
                            function (response) {
                                toastr.info("Kysymys lisätty");
                                $location.path("/exams/" + $routeParams.examId);
                            }, function (error) {
                                toastr.error(error.data);
                            }
                        );
                    }
                }

                $scope.createQuestionLibrary = function () {
                    toastr.info("Toimintoa ei ole vielä toteutettu");
                }

                $scope.copyQuestion = function (question) {
                    console.log(question.id);

                    QuestionRes.question.copy(question,
                        function (questionCopy) {
                            toastr.info("Kysymys kopioitu");
                            $location.path("/questions/" + questionCopy.id);
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.newEssayQuestion = function () {
                    $scope.questionTemplate = $scope.essayQuestionTemplate;
                    $scope.newQuestion.type = "EssayQuestion";
                    $scope.newQuestion.evaluationType = "Points";
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
                            questionToUpdate.evaluationType =  $scope.newQuestion.evaluationType;
                            break;

                        case 'MultipleChoiceQuestion':

                            break;
                    }

                    QuestionRes.questions.update({id: $scope.newQuestion.id}, questionToUpdate,
                        function (response) {
                            toastr.info("Kysymys tallennettu");
                        }, function (error) {
                            toastr.error(error.data);
                        }

                    );

                    //Set return URL pointing back to questions main page if we created question there
                    if($routeParams.examId === undefined) {
                       $scope.returnURL = "/questions/";
                    }
                    //Set return URL to exam, if we created the new question there
                    //Also bind the question to section of the exam at this point
                    else {
                        $scope.returnURL = "/exams/" + $routeParams.examId
                        ExamRes.questions.insert({eid: $routeParams.examId, sid: $routeParams.sectionId, qid: $scope.newQuestion.id}, function (section) {
                            toastr.info("Kysymys lisätty osioon.");
                        }, function (error) {
                            toastr.error(error.data);
                        })
                    }
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

                    var option_description =  $translate('sitnet_default_option_description');

                    var option = {
                        "option": option_description,
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
                            if (option.correctOption === false) {
                                option.correctOption = true;

                                QuestionRes.options.update({oid: optionId}, option,
                                    function (response) {
//                                        toastr.info("Oikea vaihtoehto päivitetty");
                                    }, function (error) {
                                        toastr.error(error.data);
                                    }
                                );
                            }
                        } else {
                            // Check for true values in other options than that was clicked and if found switch them to false
                            if (option.correctOption === true) {
                                option.correctOption = false;

                                QuestionRes.options.update({oid: optionId}, option,
                                    function (response) {
//                                        toastr.info("Edellinen oikea vaihtoehto päivitetty");
                                    }, function (error) {
                                        toastr.error(error.data);
                                    }
                                );
                            }
                        }
                    })

                    // Save changes to database

                };

                $scope.selectFile = function () {

                    // Save question before entering attachment to not lose data.
                    $scope.saveQuestion()

                    var modalInstance = $modal.open({
                        templateUrl: 'assets/templates/question-editor/dialog_attachment_selection.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: "ModalInstanceCtrl"
                    });

                    modalInstance.result.then(function () {
                        // OK button
                        $location.path('/questions/'+ $scope.newQuestion.id);
                    }, function () {
                        // Cancel button
                    });
                };

                $scope.submit = function() {

                    $http({

                        url: "attachmet",
                        data: $scope.form,
                        method: 'POST',
                        headers : {'Content-Type':'multipart/form-data'}

                    }).success(function(data){

                        console.log("OK", data)

                    }).error(function(err){"ERR", console.log(err)});


                }

            }]);
}());

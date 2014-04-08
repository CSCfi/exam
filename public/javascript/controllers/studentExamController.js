(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('StudentExamController', ['$scope', '$sce', '$routeParams', '$http', '$modal', '$location', '$translate', '$timeout', 'SITNET_CONF', 'StudentExamRes',
            function ($scope, $sce, $routeParams, $http, $modal, $location, $translate, $timeout, SITNET_CONF, StudentExamRes) {

                $scope.sectionsBar = SITNET_CONF.TEMPLATES_PATH + "student/student_sections_bar.html";
                $scope.multipleChoiseOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/multiple_choice_option.html";
                $scope.essayQuestionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/essay_question.html";
                $scope.sectionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/section_template.html";

                $scope.exams = StudentExamRes.exams.query();
                $scope.tempQuestion = null;

                $scope.countCharacters = function (question) {
                    question.answer.answerLength = question.answer.answer.length;
                    question.words = question.answer.answer.split(" ").length;
                };

                $scope.doExam = function (hash) {
                    $http.get('/student/doexam/' + $routeParams.hash)
                        .success(function (data, status, headers, config) {
                            $scope.doexam = data;
                            $scope.activeSection = $scope.doexam.examSections[0];

                            // set sections and question nubering
                            angular.forEach($scope.doexam.examSections, function (section, index) {
                                section.index = index +1;

                                angular.forEach(section.questions, function (question, index) {
                                    question.index = index +1;
                                });
                            });

                                // Loop through all questions in the active section
                            angular.forEach($scope.activeSection.questions, function (value, index) {

                                var template = "";
                                switch (value.type) {
                                    case "MultipleChoiceQuestion":
                                        template = $scope.multipleChoiseOptionTemplate;
                                        break;
                                    case "EssayQuestion":
                                        template = $scope.essayQuestionTemplate;
                                        break;
                                    default:
                                        template = "fa-question-circle";
                                        break;
                                }
                                value.template = template;

                                if (!value.answer) {
                                    // When question has not been answered it's status color is set to gray
                                    // When an active exam is opened it cannot have any answers set
                                    value.selectedAnsweredState = 'question-unanswered-header';
                                    value.questionStatus = $translate("sitnet_question_unanswered");
                                } else {
                                    value.selectedAnsweredState = 'question-answered-header';
                                    value.questionStatus = $translate("sitnet_question_answered");
                                }
                            })
                        }).
                        error(function (data, status, headers, config) {
                            // called asynchronously if an error occurs
                            // or server returns response with an error status.
                        });
                }
                if ($routeParams.hash != undefined)
                    $scope.doExam();

                $scope.activateExam = function (exam) {
                    $scope.doexam = exam;
                    var modalInstance = $modal.open({
                        templateUrl: 'assets/templates/terms_of_use.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: "ModalInstanceCtrl"
                    });

                    modalInstance.result.then(function () {
                        $http.get('/student/doexam/' + $scope.doexam.hash)
                            .success(function (clonedExam) {
                                $scope.clonedExam = clonedExam;
                                $location.path('/student/doexam/' + clonedExam.hash);
                            }).
                            error(function (error) {
                                console.log('Error happened: ' + error);
                            });
                    }, function () {
                        console.log('Modal dismissed at: ' + new Date());
                    });
                };

                $scope.setActiveSection = function (section) {
                    $scope.activeSection = section;

                    // Loop through all questions in the active section
                    angular.forEach($scope.activeSection.questions, function (value, index) {

                        var template = "";
                        switch (value.type) {
                            case "MultipleChoiceQuestion":
                                template = $scope.multipleChoiseOptionTemplate;
                                break;
                            case "EssayQuestion":
                                template = $scope.essayQuestionTemplate;
                                break;
                            default:
                                template = "fa-question-circle";
                                break;
                        }
                        value.template = template;

                        // Need to reset the flag because questions left open before switching section will be shown closed by default
                        value.questionsShown = false;
                        if (!value.answered) {
                            // When question has not been answered it's status color is set to gray
                            value.selectedAnsweredState = 'question-unanswered-header';
                            value.questionStatus = $translate("sitnet_question_unanswered");
                        } else {
                            value.selectedAnsweredState = 'question-answered-header';
                            value.questionStatus = $translate("sitnet_question_answered");
                        }
                    })
                };

                // Called when the save and exit button is clicked
                $scope.saveExam = function (doexam) {
                    StudentExamRes.exams.update({id: doexam.id}, function () {
                        toastr.info("Tentti lähetettiin tarkastettavaksi.");
                        $location.path("/exams/");

                    }, function () {
                        toastr.error("Jokin meni pieleen");
                    });
                };

                // Called when the abort button is clicked
                $scope.abortExam = function (doexam) {
                    StudentExamRes.exam.abort({id: doexam.id}, {data: doexam}, function () {
                        toastr.info("Tentti keskeytettiin.");
                        $location.path("/home/");

                    }, function () {
                        toastr.error("Jokin meni pieleen");
                    });
                };

                // Called when a radiobutton is selected
                $scope.radioChecked = function (doexam, question, option) {
                    question.answered = true;
                    question.questionStatus = $translate("sitnet_question_answered");

                    StudentExamRes.multipleChoiseAnswer.saveMultipleChoice({hash: doexam.hash, qid: question.id, oid: option.id}, { data: "hello world"}, function () {
                        toastr.info("Vastaus lisätty kysymykseen.");
                    }, function () {
                        toastr.error("Jokin meni pieleen");
                    });
                };

                $scope.saveEssay = function (questionId, answer) {
                    var params = {
                        hash: $scope.doexam.hash,
                        qid: questionId
                    };
                    var msg = {};
                    msg.answer = answer;
                    StudentExamRes.essayAnswer.saveEssay(params, msg, function () {
                        toastr.info("Vastaus lisätty kysymykseen.");
                    }, function () {
                        toastr.error("Jokin meni pieleen");
                    });
                };



                $scope.remainingTime = 0;
                $scope.onTimeout = function(){
                    $scope.remainingTime++;
                    $timeout($scope.onTimeout,1000);
                }
                $timeout($scope.onTimeout,1000);

                $scope.remainingTime


                // Called when the chevron is clicked
                $scope.chevronClicked = function (question) {

                    if (question.type == "EssayQuestion") {

                    }

                    // Flag for indicating are the questions shown or hidden
                    if (question.questionsShown == null) {
                        question.questionsShown = false;
                    }

                    // State machine for resolving how the question header is drawn
                    if (question.answered) {
                        if (question.questionsShown) {
                            question.questionsShown = false;
                            question.selectedAnsweredState = 'question-answered-header';
                        } else {
                            question.questionsShown = true;
                            question.selectedAnsweredState = 'question-active-header';
                        }
                    } else {
                        if (question.questionsShown) {
                            question.questionsShown = false;
                            question.selectedAnsweredState = 'question-unanswered-header';
                        } else {
                            question.questionsShown = true;
                            question.selectedAnsweredState = 'question-active-header';
                        }
                    }
                };
            }]);
}());
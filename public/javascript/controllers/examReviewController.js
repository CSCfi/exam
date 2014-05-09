(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamReviewController', ['$scope', '$sce', '$routeParams', '$http', '$modal', '$location', '$translate', '$timeout', 'SITNET_CONF', 'ExamRes',
            function ($scope, $sce, $routeParams, $http, $modal, $location, $translate, $timeout, SITNET_CONF, ExamRes) {

//                $scope.sectionsBar = SITNET_CONF.TEMPLATES_PATH + "student/student_sections_bar.html";
//                $scope.multipleChoiseOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/multiple_choice_option.html";
//                $scope.essayQuestionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/essay_question.html";
//                $scope.sectionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/section_template.html";
                $scope.generalInfoPath = SITNET_CONF.TEMPLATES_PATH + "exam-editor/exam_section_general.html";
                $scope.reviewSectionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_exam_section.html";
                $scope.questionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_exam_section_question.html";
//                $scope.exams = StudentExamRes.exams.query();
//                $scope.tempQuestion = null;
//
//                $scope.countCharacters = function (question) {
//                    question.answer.answerLength = question.answer.answer.length;
//                    question.words = question.answer.answer.split(" ").length;
//                };

                var examTotalScore = 0;

                if ($routeParams.id === undefined) {
                    // Todo: Should not come here, redirect to homepage if comes?
                }
                // Get the exam that was specified in the URL
                else {
                    ExamRes.exams.get({id: $routeParams.id},
                        function (exam) {
                            $scope.examToBeReviewed = exam;
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                }

                $scope.scoreAnswer = function (question) {
                    var score = 0;

                    angular.forEach(question.options, function(option, key) {
                        //todo: how about multiple choice questions?
                        if(question.answer === null) {
                            question.backgroundColor = 'grey';
                            return 0;
                        }
                        if(option.correctOption === true && question.answer.option.id === option.id) {
                            score = question.score;

//                            console.log(score);
//                            console.log($scope.totalScore);
                            question.backgroundColor = 'green';
                        }
                        if(option.correctOption === false && question.answer.option.id === option.id) {
                            question.backgroundColor = 'red';
                        }
                    });
                    return score;
                };

                $scope.getSectionTotalScore = function(section) {
                    var score = 0;

//                    section.questions.map(function (item) {
//                        switch (item.type) {
//                            case "MultipleChoiceQuestion":
//                                angular.forEach(question.options, function (option, index) {
//                                    if (option.correctOption === true && question.answer.option.id === option.id) {
//                                        score = score + question.score;
//                                    }
//                                });
//                                break;
//                            case "EssayQuestion":
//                                break;
//                            default:
//                                break;
//                        }
//                    });

                    angular.forEach(section.questions, function(question, index) {

                        switch (question.type) {
                            case "MultipleChoiceQuestion":
                                angular.forEach(question.options, function (option, index) {
                                    if (option.correctOption === true && question.answer.option.id === option.id) {
                                        score = score + question.score;
                                    }
                                });
                                break;
                            case "EssayQuestion":
                                score = score + 10;

                                break;
                            default:
                                break;
                        }


//                        angular.forEach(question.options, function (option, index) {
//
//                            if (option.correctOption === true && question.answer.option.id === option.id) {
//                                score = score + question.score;
//                            }
//                        });
                    });

                    return score;
                };

                $scope.getExamTotalScore = function(exam) {
                    var total = 0;
                    angular.forEach(exam.examSections, function(section){
                        total += $scope.getSectionTotalScore(section);
                    })
                    return total;
                }

                // Called when the review ready button is clicked
                $scope.examReviewReady = function (reviewed_exam) {
                    reviewed_exam.state = 'REVIEWED';
                    ExamRes.exams.update({id: reviewed_exam.id}, reviewed_exam, function (exam) {
                        toastr.info("Tentti tallennettu.");
                    }, function (error) {
                        toastr.error(error.data);
                    });

//                    StudentExamRes.exams.update({id: doexam.id}, function () {
//                        toastr.info("Tentti lähetettiin tarkastettavaksi.");
//                        $location.path("/exams/");
//
//                    }, function () {
//                        toastr.error(error.data);
//                    });
                };

                // Called when the cog is clicked
                $scope.cogChecked = function () {
                };

                // Called when the chevron is clicked
                $scope.chevronClicked = function (question) {
                };
            }]);
}());
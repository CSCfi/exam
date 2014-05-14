(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamReviewController', ['$scope', '$sce', '$routeParams', '$http', '$modal', '$location', '$translate', '$timeout', 'SITNET_CONF', 'ExamRes', 'QuestionRes',
            function ($scope, $sce, $routeParams, $http, $modal, $location, $translate, $timeout, SITNET_CONF, ExamRes, QuestionRes) {

                $scope.generalInfoPath = SITNET_CONF.TEMPLATES_PATH + "exam-editor/exam_section_general.html";
                $scope.reviewSectionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_exam_section.html";
                $scope.multiplechoiceQuestionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_multiplechoice_question.html";
                $scope.essayQuestionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_essay_question.html";

                var examTotalScore = 0;

                $scope.examGrading = [];

                if ($routeParams.id === undefined) {
                    // Todo: Should not come here, redirect to homepage if comes?
                }
                // Get the exam that was specified in the URL
                else {
                    ExamRes.exams.get({id: $routeParams.id},
                        function (exam) {
                            $scope.examToBeReviewed = exam;

                            if ($scope.examToBeReviewed.grading == '0-5') {
                                $scope.examGrading.push('0');
                                $scope.examGrading.push('1');
                                $scope.examGrading.push('2');
                                $scope.examGrading.push('3');
                                $scope.examGrading.push('4');
                                $scope.examGrading.push('5');
                            }
                            if ($scope.examToBeReviewed.grading == 'Hyväksytty-Hylätty') {
                            	$scope.examGrading.push('Hyväksytty');
                            	$scope.examGrading.push('Hylätty');
                            }
                            if ($scope.examToBeReviewed.grading == 'Improbatur-Laudatur') {
                            	$scope.examGrading.push('Laudatur');
                            	$scope.examGrading.push('Eximia cum laude approbatur');
                            	$scope.examGrading.push('Magna cum laude approbatur');
                            	$scope.examGrading.push('Cum laude approbatur');
                            	$scope.examGrading.push('Non sine laude approbatur');
                            	$scope.examGrading.push('Lubenter approbatur');
                            	$scope.examGrading.push('Approbatur');
                            	$scope.examGrading.push('Improbatur');
                            }
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
                        if (question.answer === null) {
                            question.backgroundColor = 'grey';
                            return 0;
                        }
                        if(option.correctOption === true && question.answer.option.id === option.id) {
                            score = question.maxScore;
                            question.backgroundColor = 'green';
                        }
                        if (option.correctOption === false && question.answer.option.id === option.id) {
                            question.backgroundColor = 'red';
                        }
                    });
                    return score;
                };

                $scope.getSectionTotalScore = function(section) {
                    var score = 0;

                    angular.forEach(section.questions, function(question, index) {

                        switch (question.type) {
                            case "MultipleChoiceQuestion":
                                angular.forEach(question.options, function (option, index) {
                                    if(question.answer === null) {
                                        return 0;
                                    }
                                    if (option.correctOption === true && question.answer.option.id === option.id) {
                                        score = score + question.maxScore;
                                    }
                                });
                                break;
                            case "EssayQuestion":
                                // Todo: This doesn't work the expected way
                                if(question.answer === null) {
                                    score = 0;
                                }
                                var number = parseFloat(question.evaluatedScore);
                                if(angular.isNumber(number)){
                                    score = score + number;
                                }

                                break;
                            default:
//                                return 0;
                                break;
                        }
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
//                    reviewed_exam.state = 'REVIEWED';

                    var examToReview = {
                        "id": reviewed_exam.id,
                        "state": 'REVIEWED',
                        "grade": reviewed_exam.grade,
                        "otherGrading": reviewed_exam.otherGrading
                    }


                    ExamRes.review.update({id: examToReview.id}, examToReview, function (exam) {
                        toastr.info("Tentti on tarkastettu.");
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                // Called when the cog is clicked
                $scope.cogChecked = function () {
                };

                // Called when the chevron is clicked
                $scope.chevronClicked = function (question) {
                };

                $scope.insertEssayScore = function (question) {
                    var questionToUpdate = {
                        "id": question.id,
                        "type": question.type,
                        "expanded": question.expanded,
                        "evaluatedScore": question.evaluatedScore
                    };

                    QuestionRes.questions.update({id: questionToUpdate.id}, questionToUpdate, function (q) {
//                        question = q;
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.setExamGrade = function (grade) {
                    $scope.examToBeReviewed.grade = grade;
                };
            }]);
}());
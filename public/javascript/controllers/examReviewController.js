(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamReviewController', ['$scope', '$sce', '$routeParams', '$http', '$modal', '$location', '$translate', '$timeout', 'SITNET_CONF', 'ExamRes', 'QuestionRes',
            function ($scope, $sce, $routeParams, $http, $modal, $location, $translate, $timeout, SITNET_CONF, ExamRes, QuestionRes) {

                $scope.generalInfoPath = SITNET_CONF.TEMPLATES_PATH + "exam-editor/exam_section_general.html";
                $scope.reviewSectionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_exam_section.html";
                $scope.multiplechoiceQuestionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_multiplechoice_question.html";
                $scope.essayQuestionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_essay_question.html";
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

                $scope.scoreMultipleChoiceAnswer = function (question) {
                    var score = 0;

                    //todo: how about multiple choice questions?
                    if (question.answer === null) {
                        question.backgroundColor = 'grey';
                    } else if (question.answer.option.correctOption === true) {
                        score = question.maxScore;
                        question.backgroundColor = 'green';
                    } else if (question.answer.option.correctOption === false) {
                        question.backgroundColor = 'red';
                    } else {
                        toastr.info("Vastauksen tila oli epämääräinen, ota yhteyttä devaajiin");
                    }

                    return score;
                };

                $scope.scoreEssayAnswer = function (question) {
                    if (question.answer === null) {
                        question.evaluatedScore = 0;
                    }
                };

                $scope.getSectionTotalScore = function(section) {
                    var score = 0;

                    angular.forEach(section.questions, function(question, index) {

                        switch (question.type) {
                            case "MultipleChoiceQuestion":
                                if (question.answer === null) {
                                    return 0;
                                }
                                if (question.answer.option.correctOption === true) {
                                    score = score + question.maxScore;
                                }
                                break;
                            case "EssayQuestion":
                                if (question.evaluatedScore) {
                                    var number = parseFloat(question.evaluatedScore);
                                    if(angular.isNumber(number)) {
                                        score = score + number;
                                    }
                                }
                                break;
                            default:
                                toastr.info("Kysymystyyppi ei ole tuettu.");
                                break;
                        }
                    });
                    return score;
                };

                $scope.getExamTotalScore = function(exam) {
                    var totalScore = 0;
                    angular.forEach(exam.examSections, function(section){
                        totalScore += $scope.getSectionTotalScore(section);
                    })

                    exam.totalScore = totalScore;

                    return totalScore;
                }

                // Called when the review ready button is clicked
                $scope.examReviewReady = function (reviewed_exam) {
                    var examToReview = {
                        "id": reviewed_exam.id,
                        "state": 'REVIEWED',
                        "grade": reviewed_exam.grade,
                        "otherGrading": reviewed_exam.otherGrading,
                        "totalScore": reviewed_exam.totalScore
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
                        "evaluatedScore": question.evaluatedScore,
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
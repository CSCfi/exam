(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamReviewController', ['$scope', '$sce', '$routeParams', '$http', '$modal', '$location', '$translate', '$timeout', 'SITNET_CONF', 'ExamRes', 'QuestionRes',
            function ($scope, $sce, $routeParams, $http, $modal, $location, $translate, $timeout, SITNET_CONF, ExamRes, QuestionRes) {

                $scope.generalInfoPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_exam_section_general.html";
                $scope.reviewSectionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_exam_section.html";
                $scope.multiplechoiceQuestionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_multiplechoice_question.html";
                $scope.essayQuestionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_essay_question.html";
                $scope.studentInfoTemplate = SITNET_CONF.TEMPLATES_PATH + "teacher/review_exam_student_info.html";

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

                    ExamRes.studentInfo.get({id: $routeParams.id},
                        function (info) {
                            $scope.userInfo = info;
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );

                }

                $scope.scoreMultipleChoiceAnswer = function (question) {
                    var score = 0;

                    if (question.answer === null) {
                        question.backgroundColor = 'grey';
                        return 0;
                    }

                    if(question.answer.option.correctOption === true) {
                        score = question.maxScore;
                        question.backgroundColor = 'green';
                    }

                    if(question.answer.option.correctOption === false) {
                        question.backgroundColor = 'red';
                    }

                    return score;
                };

                $scope.removeNewLines = function(answer) {
                    return answer ? answer.replace(/\n/g, '') : '';
                }

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

                $scope.getSectionTotalScore = function(section) {
                    var score = 0;

                    angular.forEach(section.questions, function(question, index) {

                        switch (question.type) {
                            case "MultipleChoiceQuestion":
                                if (question.answer === null) {
                                    question.backgroundColor = 'grey';
                                    return 0;
                                }
                                if(question.answer.option.correctOption === true) {
                                    score = score + question.maxScore;
                                }
                                break;
                            case "EssayQuestion":

                                if(question.evaluatedScore && question.evaluationType == 'Points') {
                                    var number = parseFloat(question.evaluatedScore);
                                    if(angular.isNumber(number)){
                                        score = score + number;
                                    }
                                }

                                break;
                            default:
//                                return 0;
                                break;
                        }
                    });
                    return score;
                };

                $scope.getSectionMaxScore = function(section) {
                    var score = 0;

                    angular.forEach(section.questions, function(question, index) {

                        switch (question.type) {
                            case "MultipleChoiceQuestion":
                                score = score + question.maxScore;
                                break;

                            case "EssayQuestion":
                                if (question.evaluationType == 'Points')
                                        score = score + question.maxScore;
                                else if (question.evaluationType == 'Select')
                                        // hyväksytty == 1.0 ja hylätty == 0
                                        score = score + 1;
                                break;

                            default:
                                toastr.error("Unknown question type: "+ question.type);
                                break;
                        }
                    });
                    return score;
                };

                $scope.getExamTotalScore = function(exam) {

                    if (exam) {
                        var total = 0;
                        angular.forEach(exam.examSections, function(section) {
                            total += $scope.getSectionTotalScore(section);
                        });
                        $scope.examToBeReviewed.totalScore = total;
                        return total;
                    }
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
                        "maxScore": question.maxScore                   // workaround for     @Column(columnDefinition="numeric default 0")
                                                                        // without this question will be updated with default value
                    };

                    QuestionRes.questions.update({id: questionToUpdate.id}, questionToUpdate, function (q) {
//                        question = q;
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.insertCreditType = function (exam) {
                    console.log($scope.examToBeReviewed.creditType);

                    var examToReview = {
                        "id": exam.id,
                        "creditType": $scope.examToBeReviewed.creditType
                    };


                    ExamRes.review.update({id: examToReview.id}, examToReview, function (exam) {
                        toastr.info("Tentti päivitetty.");
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.setExamGrade = function (grade) {
                    $scope.examToBeReviewed.grade = grade;
                };

                // Called when the save feedback button is clicked
                $scope.saveFeedback = function (exam) {

                    var examFeedback = {
                        "comment": exam.examFeedback.comment
                    };

                    // Update comment
                    if (exam.examFeedback.id) {
                        ExamRes.comment.update({eid: exam.id, cid: exam.examFeedback.id}, examFeedback, function (exam) {
                            toastr.info("Tentin kommentti päivitetty.");
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    // Insert new comment
                    } else {
                        ExamRes.comment.insert({eid: exam.id, cid: 0}, examFeedback, function (comment) {
                            toastr.info("Kommentti lisätty tenttiin.");
                            exam.examFeedback = comment;
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }
                };

                // Called when the review ready button is clicked
                $scope.examReviewReady = function (reviewed_exam) {

                    $scope.saveFeedback(reviewed_exam);

                    var examToReview = {
                        "id": reviewed_exam.id,
                        "state": 'GRADED',
                        "grade": reviewed_exam.grade,
                        "otherGrading": reviewed_exam.otherGrading,
                        "totalScore": reviewed_exam.totalScore
                    }

                    ExamRes.review.update({id: examToReview.id}, examToReview, function (exam) {
                        toastr.info("Tentti on tarkastettu.");
                        $location.path("/exams/reviews/"+ reviewed_exam.parent.id);
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

            }]);
}());
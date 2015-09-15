(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamReviewController', ['dialogs', '$document', '$rootScope', '$scope', 'sessionService',
            'examService', 'questionService', '$routeParams', '$http', '$modal', '$location', '$translate',
            '$timeout', 'EXAM_CONF', 'ExamRes', 'LanguageRes', 'QuestionRes', 'dateService', 'fileService',
            function (dialogs, $document, $rootScope, $scope, sessionService, examService, questionService,
                      $routeParams, $http, $modal, $location, $translate, $timeout, EXAM_CONF, ExamRes, LanguageRes,
                      QuestionRes, dateService, fileService) {

                $scope.generalInfoPath = EXAM_CONF.TEMPLATES_PATH + "review/review_exam_section_general.html";
                $scope.reviewSectionPath = EXAM_CONF.TEMPLATES_PATH + "review/review_exam_section.html";
                $scope.multiplechoiceQuestionPath = EXAM_CONF.TEMPLATES_PATH + "review/review_multiplechoice_question.html";
                $scope.essayQuestionPath = EXAM_CONF.TEMPLATES_PATH + "review/review_essay_question.html";
                $scope.previousParticipationPath = EXAM_CONF.TEMPLATES_PATH + "review/review_exam_previous_participation.html";
                $scope.gradingPath = EXAM_CONF.TEMPLATES_PATH + "review/review_exam_grading.html";
                $scope.multiChoiceAnswerTemplate = EXAM_CONF.TEMPLATES_PATH + "review/review_multiple_choice_answer.html";
                $scope.weightedMultiChoiceAnswerTemplate = EXAM_CONF.TEMPLATES_PATH + "review/review_weighted_multiple_choice_answer.html";

                $scope.printExam = function () {
                    window.open("/#/print/exam/" + $scope.examToBeReviewed.id, "_blank");
                };

                $scope.init = function () {
                    $document.ready(function () {
                        setTimeout(function () {
                            window.print();
                        }, 1500);
                    });
                };

                $scope.user = sessionService.getUser();

                if (!$scope.user || $scope.user.isStudent) {
                    $location.path("/unauthorized");
                }

                $scope.inspections = [];
                $scope.examGrading = [];
                $scope.examTypes = [];
                $scope.selections = {};

                LanguageRes.languages.query(function (languages) {
                    $scope.languages = languages.map(function (language) {
                        language.name = getLanguageNativeName(language.code);
                        return language;
                    });
                });

                $scope.setLanguage = function (lang) {
                    $scope.selections.language = lang;
                    $scope.examToBeReviewed.answerLanguage = lang ? lang.name : lang;
                };

                $scope.setCreditType = function (creditType) {
                    $scope.selections.type = creditType;
                    $scope.examToBeReviewed.creditType = {type: creditType};
                };

                $scope.setGrade = function (grade_id, exam) {
                    if (grade_id) {
                        $scope.examToBeReviewed.grade = {id: grade_id};
                        $scope.selections.grade = $scope.examToBeReviewed.grade.id;
                    } else {
                        $scope.selections.grade = '';
                        $scope.examToBeReviewed.grade = undefined;
                    }
                };

                $scope.checkCreditType = function (creditType) {
                    return creditType.type === $scope.selections.type;
                };

                var refreshExamTypes = function () {
                    examService.refreshExamTypes().then(function (types) {
                        $scope.examTypes = types;
                    });
                };

                refreshExamTypes();

                $scope.$on('$localeChangeSuccess', function () {
                    refreshExamTypes();
                });

                var refreshGradeNames = function () {
                    if (!$scope.examToBeReviewed) return;
                    var scale = $scope.examToBeReviewed.gradeScale || $scope.examToBeReviewed.parent.gradeScale || $scope.examToBeReviewed.course.gradeScale;
                    $scope.examGrading = scale.grades.map(function (grade) {
                        grade.name = examService.getExamGradeDisplayName(grade.name);
                        return grade;
                    });
                };

                $scope.translateGrade = function (exam) {
                    if (!exam.grade) {
                        return;
                    }
                    return examService.getExamGradeDisplayName(exam.grade.name);
                };

                $scope.hasEssayQuestions = false;
                $scope.acceptedEssays = 0;
                $scope.rejectedEssays = 0;

                // Get the exam that was specified in the URL
                ExamRes.reviewerExam.get({eid: $routeParams.id},
                    function (exam) {
                        $scope.examToBeReviewed = exam;
                        if (!$scope.examToBeReviewed.customCredit) {
                            $scope.examToBeReviewed.customCredit = $scope.examToBeReviewed.course.credits;
                        }

                        if (exam) {
                            angular.forEach($scope.examToBeReviewed.examSections, function (section) {
                                angular.forEach(section.sectionQuestions, function (sectionQuestion) {
                                    var question = sectionQuestion.question;

                                    if (question.type === "EssayQuestion") {
                                        if (question.evaluationType === "Select") {
                                            if (question.evaluatedScore == 1) {
                                                $scope.acceptedEssays++;
                                            } else if (question.evaluatedScore == 0) {
                                                $scope.rejectedEssays++;
                                            }
                                        }
                                        $scope.hasEssayQuestions = true;
                                    }
                                });
                            });
                            if (exam.answerLanguage) {
                                $scope.selections.language = exam.answerLanguage;
                            } else if (exam.examLanguages.length === 1) {
                                // Use parent's language as default answer language if there is a single one to choose from
                                $scope.selections.language = getLanguageNativeName(exam.examLanguages[0].code);
                            }
                            if (exam.creditType) {
                                $scope.selections.type = exam.creditType.type.toUpperCase();
                            } else {
                                // default to examType
                                $scope.selections.type = exam.examType.type.toUpperCase();
                            }

                            if (exam.grade && exam.grade.id) {
                                $scope.selections.grade = exam.grade.id;
                            } else {
                                $scope.selections.grade = '';
                                $scope.examToBeReviewed.grade = {};
                            }
                        }

                        var isOwner = function () {
                            return $scope.examToBeReviewed.parent.examOwners.map(function (owner) {
                                    return owner.id;
                                }).indexOf($scope.user.id) !== -1;
                        };

                        var isCreator = function () {
                            return $scope.examToBeReviewed.parent.creator.id === $scope.user.id;
                        };

                        $scope.isCreatorOrOwnerOrAdmin = function () {
                            return $scope.examToBeReviewed && ($scope.user.isAdmin || isCreator() || isOwner());
                        };

                        $scope.isReadOnly = $scope.examToBeReviewed.state === "GRADED_LOGGED" ||
                            $scope.examToBeReviewed.state === "ARCHIVED" ||
                            $scope.examToBeReviewed.state === "ABORTED";
                        $scope.isGraded = $scope.examToBeReviewed.state === "GRADED";

                        refreshGradeNames();

                        $scope.reviewStatus = [
                            {
                                "key": true,
                                "value": $translate.instant('sitnet_ready')
                            },
                            {
                                "key": false,
                                "value": $translate.instant('sitnet_in_progress')
                            }
                        ];

                        $scope.toggleReady = function () {
                            angular.forEach($scope.inspections, function (inspection) {
                                if (inspection.user.id === $scope.user.id) {
                                    // toggle ready ->
                                    ExamRes.inspectionReady.update({
                                        id: inspection.id,
                                        ready: inspection.ready
                                    }, function (result) {
                                        toastr.info($translate.instant('sitnet_exam_updated'));
                                        inspection.ready = result.ready;
                                        $scope.startReview();
                                    }, function (error) {
                                        toastr.error(error.data);
                                    });
                                }
                            });
                        };

                        // get exam inspections ->
                        ExamRes.inspections.query({id: $scope.examToBeReviewed.id},
                            function (inspections) {
                                $scope.inspections = inspections;
                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );

                        ExamRes.studentInfo.get({id: $routeParams.id},
                            function (info) {
                                $scope.userInfo = info;
                                if (info && info.duration) {
                                    var duration = moment.utc(new Date(info.duration));
                                    if (duration.second() > 29) {
                                        duration.add(1, 'minutes');
                                    }
                                    $scope.userInfo.duration = duration.format('HH:mm');
                                }
                                // get previous participations ->
                                ExamRes.examParticipationsOfUser.query(
                                    {
                                        eid: $scope.examToBeReviewed.parent.id,
                                        uid: $scope.userInfo.user.id
                                    }, function (participations) {
                                        $scope.previousParticipations = participations;
                                    });

                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );
                        ExamRes.reservationInfo.get({eid: $routeParams.id},
                            function (reservation) {
                                $scope.reservation = reservation;
                            }
                        );
                        ExamRes.examEnrolments.query({eid: $routeParams.id}, function (enrolments) {
                            if (enrolments.length > 1) {
                                console.log("WARNING: found several enrolments for a student exam!");
                            }
                            $scope.enrolment = enrolments[0];
                        });
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                $scope.viewAnswers = function (examId) {
                    window.open("/#/exams/review/" + examId, "_blank");
                };

                $scope.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                $scope.scoreWeightedMultipleChoiceAnswer = function (question) {
                    var score = question.answer.options.reduce(function (a, b) {
                        return a + b.score;
                    }, 0);
                    if (score < 0) {
                        score = 0;
                    }
                    return score;
                };

                $scope.scoreMultipleChoiceAnswer = function (sectionQuestion) {
                    var score = 0;
                    var question = sectionQuestion.question;
                    if (question.answer === null) {
                        question.backgroundColor = 'grey';
                        return 0;
                    }
                    if (question.answer.options.length != 1) {
                        console.error("multiple options selected for a MultiChoice answer!");
                    }
                    if (question.answer.options[0].correctOption === true) {
                        score = question.maxScore;
                        question.backgroundColor = 'green';
                    } else {
                        question.backgroundColor = 'red';
                    }

                    return score;
                };

                $scope.range = function (min, max, step) {
                    step |= 1;
                    var input = [];
                    for (var i = min; i <= max; i += step) {
                        input.push(i);
                    }
                    return input;
                };

                $scope.isAnswer = function (option, question) {
                    return question.answer.options.map(function (o) {
                            return o.id
                        }).indexOf(option.id) > -1;
                };

                $scope.getSectionTotalScore = function (section) {
                    var score = 0;

                    angular.forEach(section.sectionQuestions, function (sectionQuestion) {
                        var question = sectionQuestion.question;
                        switch (question.type) {
                            case "MultipleChoiceQuestion":
                                if (question.answer === null) {
                                    question.backgroundColor = 'grey';
                                    return 0;
                                }
                                if (question.answer.options.length != 1) {
                                    console.error("multiple options selected for a MultiChoice answer!");
                                }
                                if (question.answer.options[0].correctOption === true) {
                                    score += question.maxScore;
                                }
                                break;
                            case "WeightedMultipleChoiceQuestion":
                                if (question.answer === null) {
                                    question.backgroundColor = 'grey';
                                    return 0;
                                }
                                score += question.answer.options.reduce(function (a, b) {
                                    return a + b.score;
                                }, 0);
                                break;
                            case "EssayQuestion":

                                if (question.evaluatedScore && question.evaluationType === 'Points') {
                                    var number = parseFloat(question.evaluatedScore);
                                    if (angular.isNumber(number)) {
                                        score += number;
                                    }
                                }
                                break;
                            default:
                                break;
                        }
                    });
                    return score;
                };

                $scope.calculateMaxPoints = function (question) {
                    return questionService.calculateMaxPoints(question);
                };

                $scope.getSectionMaxScore = function (section) {
                    var score = 0;

                    angular.forEach(section.sectionQuestions, function (sectionQuestion) {
                        var question = sectionQuestion.question;
                        switch (question.type) {
                            case "MultipleChoiceQuestion":
                                score += question.maxScore;
                                break;
                            case "WeightedMultipleChoiceQuestion":
                                score += questionService.calculateMaxPoints(question);
                                break;
                            case "EssayQuestion":
                                if (question.evaluationType == 'Points') {
                                    score += question.maxScore;
                                }
                                break;

                            default:
                                toastr.error($translate.instant('sitnet_unknown_question_type') + ": " + question.type);
                                break;
                        }
                    });
                    return score;
                };

                $scope.getExamMaxPossibleScore = function (exam) {
                    if (exam) {
                        var total = 0;
                        angular.forEach(exam.examSections, function (section) {
                            total += $scope.getSectionMaxScore(section);
                        });

                        return total;
                    }
                };

                $scope.getExamTotalScore = function (exam) {
                    if (exam) {
                        var total = 0;
                        angular.forEach(exam.examSections, function (section) {
                            total += $scope.getSectionTotalScore(section);
                        });
                        $scope.examToBeReviewed.totalScore = total;
                        return total;
                    }
                };

                $scope.truncate = function (answer, offset) {
                    return questionService.truncate(answer, offset);
                };

                var refreshRejectedAcceptedCounts = function () {
                    var accepted = 0;
                    var rejected = 0;
                    angular.forEach($scope.examToBeReviewed.examSections, function (section) {
                        angular.forEach(section.sectionQuestions, function (sectionQuestion) {
                            var question = sectionQuestion.question;
                            if (question.type === "EssayQuestion") {
                                if (question.evaluationType === "Select") {
                                    if (question.evaluatedScore == 1) {
                                        accepted++;
                                    } else if (question.evaluatedScore == 0) {
                                        rejected++;
                                    }
                                }
                            }
                        });
                    });
                    $scope.acceptedEssays = accepted;
                    $scope.rejectedEssays = rejected;
                };

                $scope.toggleQuestionExpansion = function (sectionQuestion) {
                    sectionQuestion.question.reviewExpanded = !sectionQuestion.question.reviewExpanded;
                };

                var getReviewUpdate = function (exam, state) {
                    return {
                        "id": exam.id,
                        "state": state || exam.state,
                        "grade": exam.grade && exam.grade.id ? exam.grade.id : "",
                        "customCredit": exam.customCredit,
                        "totalScore": exam.totalScore,
                        "creditType": $scope.selections.type,
                        "answerLanguage": $scope.selections.language,
                        "additionalInfo": exam.additionalInfo
                    };
                };

                // Set review status as started if not already done so
                $scope.startReview = function () {
                    if ($scope.examToBeReviewed.state === 'REVIEW') {
                        var review = getReviewUpdate($scope.examToBeReviewed, 'REVIEW_STARTED');
                        ExamRes.review.update({id: review.id}, review);
                    }
                };

                $scope.insertEssayScore = function (sectionQuestion) {
                    var question = sectionQuestion.question;
                    QuestionRes.score.update({id: question.id}, {"evaluatedScore": question.evaluatedScore}, function (q) {
                        toastr.info($translate.instant("sitnet_graded"));
                        if (q.evaluationType === "Select") {
                            refreshRejectedAcceptedCounts();
                        }
                        $scope.startReview();
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.getTeacherCount = function () {
                    var count = $scope.inspections.length;
                    if ($scope.examToBeReviewed &&
                        $scope.examToBeReviewed.parent &&
                        $scope.examToBeReviewed.parent.examOwners) {
                        // Do not add up if user exists in both groups
                        var uniques = $scope.examToBeReviewed.parent.examOwners.filter(function (owner) {
                            return $scope.inspections.map(function (inspection) {
                                    return inspection.user.id;
                                }).indexOf(owner.id) === -1;
                        });
                        count += uniques.length;
                    }
                    return count;
                };

                $scope.toggleFeedbackHiding = function (hidden) {
                    if (hidden) {
                        $scope.saveFeedback();
                    }
                    return !hidden;
                };

                // Called when the save feedback button is clicked
                $scope.saveFeedback = function (withoutNotice) {

                    var examFeedback = {
                        "comment": $scope.examToBeReviewed.examFeedback.comment
                    };

                    // Update comment
                    if ($scope.examToBeReviewed.examFeedback.id) {
                        ExamRes.comment.update({
                            eid: $scope.examToBeReviewed.id,
                            cid: $scope.examToBeReviewed.examFeedback.id
                        }, examFeedback, function (exam) {
                            if (!withoutNotice) {
                                toastr.info($translate.instant("sitnet_comment_updated"));
                            }
                        }, function (error) {
                            toastr.error(error.data);
                        });
                        // Insert new comment
                    } else {
                        ExamRes.comment.insert({
                            eid: $scope.examToBeReviewed.id,
                            cid: 0
                        }, examFeedback, function (comment) {
                            if (!withoutNotice) {
                                toastr.info($translate.instant("sitnet_comment_added"));
                            }
                            $scope.examToBeReviewed.examFeedback = comment;
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }
                };

                var checkCredit = function () {
                    var credit = $scope.examToBeReviewed.customCredit;
                    var valid = !isNaN(credit) && credit >= 0;
                    if (!valid) {
                        toastr.error($translate.instant('sitnet_not_a_valid_custom_credit'));
                        // Reset to default
                        $scope.examToBeReviewed.customCredit = $scope.examToBeReviewed.course.credits;
                    }
                    return valid;
                };

                var doUpdate = function (newState, review, messages, exam) {
                    ExamRes.review.update({id: review.id}, review, function () {
                        $scope.saveFeedback(true);
                        if (newState === 'REVIEW_STARTED') {
                            messages.forEach(function (msg) {
                                toastr.warning($translate.instant(msg));
                            });
                            $timeout(function () {
                                toastr.info($translate.instant('sitnet_review_saved'));
                            }, 1000);
                        } else {
                            toastr.info($translate.instant("sitnet_review_graded"));
                            if ($scope.user.isAdmin) {
                                $location.path("/");
                            } else {
                                $location.path("exams/reviews/" + exam.parent.id);
                            }
                        }
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                // called when Save button is clicked
                $scope.updateExam = function (reviewed_exam) {
                    if (!$scope.isCreatorOrOwnerOrAdmin()) {
                        if (reviewed_exam.state !== 'GRADED') {
                            // Just save feedback and leave
                            $scope.saveFeedback(true);
                            toastr.info($translate.instant('sitnet_saved'));
                            $location.path("exams/reviews/" + reviewed_exam.parent.id);
                        }
                    }
                    else {
                        if (!checkCredit()) {
                            return;
                        }
                        var messages = [];
                        if (!$scope.selections.grade) {
                            messages.push('sitnet_participation_unreviewed');
                        }
                        if (!$scope.selections.type) {
                            messages.push('sitnet_exam_choose_credit_type');
                        }
                        if (!$scope.selections.language) {
                            messages.push('sitnet_exam_choose_response_language');
                        }
                        var oldState = reviewed_exam.state;
                        var newState = messages.length > 0 ? 'REVIEW_STARTED' : 'GRADED';

                        if (newState !== 'GRADED' || oldState === 'GRADED') {
                            var review = getReviewUpdate(reviewed_exam, newState);
                            doUpdate(newState, review, messages, reviewed_exam);
                        } else {
                            var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_grade_review'));
                            dialog.result.then(function (btn) {
                                var review = getReviewUpdate(reviewed_exam, newState);
                                doUpdate(newState, review, messages, reviewed_exam);
                            });
                        }
                    }
                };

                // called when send email button is clicked
                $scope.sendEmailMessage = function () {
                    if (!$scope.message || $scope.message.length === 0) {
                        toastr.error($translate.instant("sitnet_email_empty"));
                        return;
                    }
                    ExamRes.email.inspection({
                        eid: $scope.examToBeReviewed.id,
                        msg: $scope.message
                    }, function (response) {
                        toastr.info($translate.instant("sitnet_email_sent"));
                        $scope.message = "";
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.saveExamRecord = function (reviewedExam) {

                    if (!checkCredit()) {
                        return;
                    }

                    var messages = [];
                    if (!reviewedExam.grade) {
                        if ($scope.selections.grade) {
                            reviewedExam.grade = {id: $scope.selections.grade};
                        } else {
                            messages.push('sitnet_participation_unreviewed');
                        }
                    }
                    if (!reviewedExam.creditType) {
                        if ($scope.selections.type) {
                            reviewedExam.creditType = $scope.selections.type;
                        } else {
                            messages.push('sitnet_exam_choose_credit_type');
                        }
                    }
                    if (!$scope.selections.language) {
                        messages.push('sitnet_exam_choose_response_language');
                    }
                    if (messages.length > 0) {
                        messages.forEach(function (msg) {
                            toastr.error($translate.instant(msg));
                        });
                    }
                    else {
                        var dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                            examService.getRecordReviewConfirmationDialogContent(reviewedExam.examFeedback.comment));
                        dialog.result.then(function () {
                            $scope.saveFeedback(true);
                            var examToRecord = getReviewUpdate(reviewedExam, 'GRADED');
                            examToRecord.additionalInfo = $scope.additionalInfo;

                            ExamRes.review.update({id: examToRecord.id}, examToRecord, function () {
                                if (reviewedExam.state !== 'GRADED') {
                                    toastr.info($translate.instant("sitnet_review_graded"));
                                }
                                examToRecord.state = 'GRADED_AND_LOGGED';
                                ExamRes.saveRecord.add(examToRecord, function (exam) {
                                    toastr.info($translate.instant('sitnet_review_recorded'));
                                    if ($scope.user.isAdmin) {
                                        $location.path("/");
                                    } else {
                                        $location.path("exams/reviews/" + reviewedExam.parent.id);
                                    }
                                }, function (error) {
                                    toastr.error(error.data);
                                });
                            }, function (error) {
                                toastr.error(error.data);
                            });
                        });
                    }
                };

                $scope.selectFile = function () {

                    var exam = $scope.examToBeReviewed;

                    var ctrl = ["$scope", "$modalInstance", function ($scope, $modalInstance) {
                        $scope.exam = exam;
                        fileService.getMaxFilesize().then(function (data) {
                            $scope.maxFileSize = data.filesize;
                        });
                        $scope.submit = function () {
                            fileService.upload("attachment/exam/" + exam.id + "/feedback", $scope.attachmentFile,
                                {examId: $scope.exam.id}, $scope.exam.examFeedback, $modalInstance);
                        };
                        $scope.cancel = function () {
                            $modalInstance.dismiss('Canceled');
                        };
                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'common/dialog_attachment_selection.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: ctrl
                    });

                    modalInstance.result.then(function () {
                        // OK button
                        $modalInstance.dismiss('Closed');
                    });
                };

                $scope.stripHtml = function (text) {
                    if (text && text.indexOf("math-tex") === -1) {
                        return String(text).replace(/<[^>]+>/gm, '');
                    }
                    return text;
                };
            }
        ])
        .controller('RecordReviewConfirmationCtrl', function ($scope, $modalInstance) {
            $scope.yes = function () {
                $modalInstance.close();
            };

            $scope.no = function () {
                $modalInstance.dismiss('canceled');
            }
        });
}());

(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamReviewController', ['dialogs', '$document', '$q', '$scope', 'sessionService', 'examReviewService',
            'examService', 'questionService', '$routeParams', '$http', '$uibModal', '$location', '$translate',
            '$timeout', '$sce', 'EXAM_CONF', 'ExamRes', 'LanguageRes', 'LanguageInspectionRes', 'QuestionRes',
            'dateService', 'fileService',
            function (dialogs, $document, $q, $scope, sessionService, examReviewService, examService, questionService,
                      $routeParams, $http, $modal, $location, $translate, $timeout, $sce, EXAM_CONF, ExamRes, LanguageRes,
                      LanguageInspectionRes, QuestionRes, dateService, fileService) {

                $scope.generalInfoPath = EXAM_CONF.TEMPLATES_PATH + "review/exam_general_info.html";
                $scope.reviewSectionPath = EXAM_CONF.TEMPLATES_PATH + "review/exam_section.html";
                $scope.multiplechoiceQuestionPath = EXAM_CONF.TEMPLATES_PATH + "review/multiple_choice_question.html";
                $scope.essayQuestionPath = EXAM_CONF.TEMPLATES_PATH + "review/essay_question.html";
                $scope.clozeTestPath = EXAM_CONF.TEMPLATES_PATH + "review/cloze_test.html";
                $scope.previousParticipationPath = EXAM_CONF.TEMPLATES_PATH + "review/previous_participation.html";
                $scope.multiChoiceAnswerTemplate = EXAM_CONF.TEMPLATES_PATH + "review/multiple_choice_answer.html";
                $scope.weightedMultiChoiceAnswerTemplate = EXAM_CONF.TEMPLATES_PATH + "review/weighted_multiple_choice_answer.html";

                $scope.printSectionTemplate = EXAM_CONF.TEMPLATES_PATH + "review/print/exam_section.html";
                $scope.printMultiChoiceQuestionTemplate = EXAM_CONF.TEMPLATES_PATH + "review/print/multiple_choice_question.html";
                $scope.printEssayQuestionTemplate = EXAM_CONF.TEMPLATES_PATH + "review/print/essay_question.html";

                $scope.printExam = function () {
                    window.open("/print/exam/" + $scope.exam.id, "_blank");
                };

                $scope.init = function () {
                    $document.ready(function () {
                        setTimeout(function () {
                            window.print();
                        }, 2000);
                    });
                };

                $scope.user = sessionService.getUser();

                $scope.inspections = [];
                $scope.examGrading = [];
                $scope.examTypes = [];
                $scope.selections = {};

                $scope.exam = {languageInspection: undefined};

                var pickExamLanguage = function () {
                    return examReviewService.pickExamLanguage($scope.exam);
                };

                $scope.setLanguage = function (lang) {
                    $scope.selections.language = lang;
                    $scope.exam.answerLanguage = lang ? lang.name : lang;
                };

                $scope.setCreditType = function () {
                    if ($scope.selections.type && $scope.selections.type.type) {
                        $scope.exam.creditType = {type: $scope.selections.type.type};
                    } else {
                        delete $scope.exam.creditType;
                    }
                };

                $scope.setGrade = function () {
                    if ($scope.selections.grade &&
                        ($scope.selections.grade.id || $scope.selections.grade.type === 'NONE')) {
                        $scope.exam.grade = $scope.selections.grade;
                        $scope.exam.gradeless = $scope.selections.grade.type === 'NONE';
                    } else {
                        delete $scope.exam.grade;
                        $scope.exam.gradeless = false;
                    }
                };

                $scope.checkCreditType = function (creditType) {
                    return creditType.type === $scope.selections.type;
                };

                var setGrade = function () {
                    if (!$scope.exam.grade || !$scope.exam.grade.id) {
                        $scope.exam.grade = {};
                    }
                    var scale = $scope.exam.gradeScale || $scope.exam.parent.gradeScale || $scope.exam.course.gradeScale;
                    scale.grades = scale.grades || [];
                    $scope.examGrading = scale.grades.map(function (grade) {
                        grade.type = grade.name;
                        grade.name = examService.getExamGradeDisplayName(grade.name);

                        if ($scope.exam.grade && $scope.exam.grade.id === grade.id) {
                            $scope.exam.grade.type = grade.type;
                            $scope.selections.grade = grade;
                        }
                        return grade;
                    });
                    // The "no grade" option
                    var noGrade = {type: 'NONE', name: examService.getExamGradeDisplayName('NONE')};
                    if ($scope.exam.gradeless && !$scope.selections.grade) {
                        $scope.selections.grade = noGrade;
                    }
                    $scope.examGrading.push(noGrade);
                };

                $scope.translateGrade = function (exam) {
                    if (!exam.grade) {
                        return;
                    }
                    return examService.getExamGradeDisplayName(exam.grade.name);
                };

                var setQuestionAmounts = function () {
                    var amounts = questionService.getQuestionAmounts($scope.exam);
                    $scope.hasEssayQuestions = amounts.hasEssays;
                    $scope.acceptedEssays = amounts.accepted;
                    $scope.rejectedEssays = amounts.rejected;
                };

                var setCredits = function () {
                    examService.refreshExamTypes().then(function (types) {
                        var examType = $scope.exam.creditType || $scope.exam.examType;
                        $scope.examTypes = types;
                        types.forEach(function (type) {
                            if (examType.id === type.id) {
                                $scope.selections.type = type;
                            }
                        });
                    });
                    if ($scope.exam && $scope.exam.course && !$scope.exam.customCredit) {
                        $scope.exam.customCredit = $scope.exam.course.credits;
                    }
                };

                var setExamLanguage = function () {
                    var lang = pickExamLanguage();
                    LanguageRes.languages.query(function (languages) {
                        $scope.languages = languages.map(function (language) {
                            if (lang && lang.code === language.code) {
                                $scope.selections.language = language;
                            }
                            language.name = getLanguageNativeName(language.code);
                            return language;
                        });
                    });
                };

                $scope.$on('$localeChangeSuccess', function () {
                    setCredits();
                    $scope.examGrading.forEach(function (eg) {
                       eg.name = examService.getExamGradeDisplayName(eg.type);
                    });
                });

                var setTemplates = function () {
                    if ($scope.exam.subjectToLanguageInspection) {
                        $scope.toolbarPath = EXAM_CONF.TEMPLATES_PATH + "review/maturity_toolbar.html";
                        $scope.gradingPath = EXAM_CONF.TEMPLATES_PATH + "review/maturity_grading.html";
                        $scope.inspectionCommentsPath = EXAM_CONF.TEMPLATES_PATH + "review/inspection_comments.html";
                    } else {
                        $scope.toolbarPath = EXAM_CONF.TEMPLATES_PATH + "review/toolbar.html";
                        $scope.gradingPath = EXAM_CONF.TEMPLATES_PATH + "review/grading.html";
                    }
                    if ($scope.isUnderLanguageInspection()) {
                        $scope.feedbackWindowPath = EXAM_CONF.TEMPLATES_PATH + "review/language_feedback.html";
                    } else {
                        $scope.feedbackWindowPath = EXAM_CONF.TEMPLATES_PATH + "review/feedback.html";
                    }
                };

                $scope.isOwnerOrAdmin = function () {
                    return examService.isOwnerOrAdmin($scope.exam);
                };

                $scope.isReadOnly = function () {
                    return examReviewService.isReadOnly($scope.exam);
                };

                $scope.isGraded = function () {
                    return examReviewService.isGraded($scope.exam);
                };

                $scope.getWordCount = function (text) {
                    return examReviewService.countWords(text);
                };

                $scope.getCharacterCount = function (text) {
                    return examReviewService.countCharacters(text);
                };

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

                var getExamInspections = function () {
                    ExamRes.inspections.query({id: $scope.exam.id},
                        function (inspections) {
                            $scope.inspections = inspections;
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                var getStudentInfo = function () {
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
                                    eid: $scope.exam.parent.id,
                                    uid: $scope.userInfo.user.id
                                }, function (participations) {
                                    $scope.previousParticipations = participations;
                                });

                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                var getReservationInfo = function () {
                    ExamRes.reservationInfo.get({eid: $routeParams.id},
                        function (reservation) {
                            $scope.reservation = reservation;
                        }
                    );
                };

                var getEnrolments = function () {
                    ExamRes.examEnrolments.query({eid: $routeParams.id}, function (enrolments) {
                        if (enrolments.length > 1) {
                            console.log("WARNING: found several enrolments for a student exam!");
                        }
                        $scope.enrolment = enrolments[0];
                    });
                };


                // Get the exam that was specified in the URL
                ExamRes.reviewerExam.get({eid: $routeParams.id},
                    function (exam) {
                        exam.examSections.forEach(function (es) {
                            es.sectionQuestions.filter(function (esq) {
                                return esq.question.type === 'ClozeTestQuestion' && esq.clozeTestAnswer.answer;
                            }).forEach(function (esq) {
                                esq.clozeTestAnswer.answer = JSON.parse(esq.clozeTestAnswer.answer);
                            });
                        });
                        $scope.exam = exam;

                        setQuestionAmounts();
                        setExamLanguage();
                        setCredits();
                        setGrade();
                        setTemplates();

                        getExamInspections();
                        getStudentInfo();
                        getReservationInfo();
                        getEnrolments();
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                $scope.viewAnswers = function (examId) {
                    window.open("/exams/review/" + examId, "_blank");
                };

                $scope.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                $scope.scoreWeightedMultipleChoiceAnswer = function (sectionQuestion) {
                    if (sectionQuestion.question.type !== 'WeightedMultipleChoiceQuestion') {
                        return 0;
                    }
                    return questionService.scoreWeightedMultipleChoiceAnswer(sectionQuestion);
                };

                $scope.scoreMultipleChoiceAnswer = function (sectionQuestion) {
                    if (sectionQuestion.question.type !== 'MultipleChoiceQuestion') {
                        return 0;
                    }
                    return questionService.scoreMultipleChoiceAnswer(sectionQuestion);
                };

                $scope.displayClozeTestScore = function (sectionQuestion) {
                    var score = sectionQuestion.clozeTestAnswer.score;
                    return score.correctAnswers * sectionQuestion.maxScore /
                        (score.correctAnswers + score.incorrectAnswers).toFixed(2) + ' / ' + sectionQuestion.maxScore;
                };

                $scope.range = function (min, max, step) {
                    return questionService.range(min, max, step);
                };

                $scope.toggleFeedbackVisibility = function () {
                    var selector = $(".body");
                    if ($scope.hideEditor) {
                        selector.show();
                    } else {
                        selector.hide();
                    }
                    $scope.hideEditor = !$scope.hideEditor;
                };

                $scope.calculateMaxPoints = function (question) {
                    return questionService.calculateMaxPoints(question);
                };

                $scope.getExamMaxPossibleScore = function (exam) {
                    return examService.getMaxScore(exam);
                };

                $scope.getExamTotalScore = function (exam) {
                    return examService.getTotalScore(exam);
                };

                $scope.toggleQuestionExpansion = function (sectionQuestion) {
                    sectionQuestion.reviewExpanded = !sectionQuestion.reviewExpanded;
                };

                $scope.getAnsweredOption = function (sectionQuestion) {
                    if (!sectionQuestion) {
                        return;
                    }
                    var options = sectionQuestion.options.filter(function (o) {
                        return o.answered;
                    });
                    if (options.length > 1) {
                        console.error("several options answered!");
                    } else {
                        return options.length === 0 ? undefined : options[0];
                    }
                };

                var getReviewUpdate = function (exam, state) {
                    var creditType = exam.creditType || $scope.selections.type;
                    return {
                        "id": exam.id,
                        "state": state || exam.state,
                        "grade": exam.grade && exam.grade.id ? exam.grade.id : undefined,
                        "gradeless": exam.gradeless,
                        "customCredit": exam.customCredit,
                        "totalScore": exam.totalScore,
                        "creditType": creditType ? creditType.type : undefined,
                        "answerLanguage": $scope.selections.language ? $scope.selections.language.code : undefined,
                        "additionalInfo": exam.additionalInfo
                    };
                };

                // Set review status as started if not already done so
                $scope.startReview = function () {
                    if ($scope.exam.state === 'REVIEW') {
                        var review = getReviewUpdate($scope.exam, 'REVIEW_STARTED');
                        ExamRes.review.update({id: review.id}, review);
                    }
                };

                $scope.insertEssayScore = function (sectionQuestion) {
                    var answer = sectionQuestion.essayAnswer;
                    if (!answer || isNaN(answer.evaluatedScore)) {
                        return;
                    }

                    QuestionRes.score.update({id: sectionQuestion.id, evaluatedScore: answer.evaluatedScore}, function (q) {
                        toastr.info($translate.instant("sitnet_graded"));
                        if (q.evaluationType === "Selection") {
                            setQuestionAmounts();
                        }
                        $scope.startReview();
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.getTeacherCount = function () {
                    var count = $scope.inspections.length;
                    if ($scope.exam &&
                        $scope.exam.parent &&
                        $scope.exam.parent.examOwners) {
                        // Do not add up if user exists in both groups
                        var uniques = $scope.exam.parent.examOwners.filter(function (owner) {
                            return $scope.inspections.map(function (inspection) {
                                    return inspection.user.id;
                                }).indexOf(owner.id) === -1;
                        });
                        count += uniques.length;
                    }
                    return count;
                };

                $scope.trustAsHtml = function (content) {
                    return $sce.trustAsHtml(content);
                };

                $scope.saveFeedback = function (withoutNotice) {
                    return examReviewService.saveFeedback($scope.exam, withoutNotice);
                };

                $scope.saveInspectionStatement = function () {
                    var deferred = $q.defer();
                    var statement = {
                        "id": $scope.exam.languageInspection.id,
                        "comment": $scope.exam.languageInspection.statement.comment
                    };
                    // Update comment
                    LanguageInspectionRes.statement.update(statement,
                        function () {
                            toastr.info($translate.instant("sitnet_statement_updated"));
                            deferred.resolve();
                        }, function (error) {
                            toastr.error(error.data);
                            deferred.reject(error.data);
                        });
                    return deferred.promise;
                };

                var doUpdate = function (newState, review, messages, exam) {
                    ExamRes.review.update({id: review.id}, review, function () {
                        $scope.saveFeedback(true).then(function () {
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
                                    $location.path("exams/examTabs/"+exam.parent.id+"/3");
                                }
                            }
                        });
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                var updateMaturity = function (exam, messages, state) {
                    var review = getReviewUpdate(exam);
                    doUpdate(state || exam.state, review, messages, exam);
                };

                var updateExam = function (exam, messages) {
                    var oldState = exam.state;
                    var newState = messages.length > 0 ? 'REVIEW_STARTED' : 'GRADED';

                    if (newState !== 'GRADED' || oldState === 'GRADED') {
                        var review = getReviewUpdate(exam, newState);
                        doUpdate(newState, review, messages, exam);
                    } else {
                        var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_grade_review'));
                        dialog.result.then(function (btn) {
                            var review = getReviewUpdate(exam, newState);
                            doUpdate(newState, review, messages, exam);
                        });
                    }
                };


                // called when Save button is clicked
                $scope.updateExam = function (exam) {
                    if (!$scope.isOwnerOrAdmin()) {
                        if (exam.state !== 'GRADED') {
                            // Just save feedback and leave
                            $scope.saveFeedback(true).then(function () {
                                toastr.info($translate.instant('sitnet_saved'));
                                $location.path("exams/examTabs/"+exam.parent.id+"/3");
                            });
                        }
                    } else if ($scope.isUnderLanguageInspection()) {
                        $scope.saveFeedback();
                    }
                    else {
                        if (!examReviewService.checkCredit(exam)) {
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
                        if (exam.executionType.type === 'MATURITY') {
                            updateMaturity(exam, messages);
                        } else {
                            updateExam(exam, messages);
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
                        eid: $scope.exam.id,
                        msg: $scope.message
                    }, function (response) {
                        toastr.info($translate.instant("sitnet_email_sent"));
                        $scope.message = "";
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.isSelected = function (grade) {
                    return grade && $scope.selections.grade && $scope.selections.grade.id === grade.id;
                };

                $scope.archiveExam = function (exam) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                        $translate.instant('sitnet_confirm_archiving_without_grade'));
                    dialog.result.then(function () {
                        $scope.saveFeedback(true).then(function () {
                            ExamRes.archive.update({ids: exam.id, fastForward: true}, function () {
                                toastr.info($translate.instant('sitnet_exams_archived'));
                                if ($scope.user.isAdmin) {
                                    $location.path("/");
                                } else {
                                    $location.path("exams/examTabs/"+exam.parent.id+"/3");
                                }
                            });
                        });
                    });
                };

                $scope.addInspectionComment = function (exam) {
                    var ctrl = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {
                        $scope.data = {id: exam.id, comment: null};
                        $scope.submit = function () {
                            ExamRes.inspectionComment.create($scope.data, function (comment) {
                                $modalInstance.close(comment);
                            });
                        };
                        $scope.cancel = function () {
                            $modalInstance.dismiss('Canceled');
                        };
                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'review/dialogs/new_inspection_comment.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: ctrl
                    });

                    modalInstance.result.then(function (comment) {
                        // OK button
                        $scope.exam.inspectionComments.unshift(comment);
                        console.log("closed");
                    });
                };

                var sendToRegistry = function (exam, res, followUpUrl) {
                    exam.state = 'GRADED_LOGGED';
                    res(exam, function (data) {
                        toastr.info($translate.instant('sitnet_review_recorded'));
                        if (followUpUrl) {
                            $location.path(followUpUrl);
                        } else if ($scope.user.isAdmin) {
                            $location.path("/");
                        } else {
                            $location.path("exams/examTabs/"+$scope.exam.parent.id+"/3");
                        }
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                var doRegister = function (exam, res, followUpUrl) {
                    $scope.saveFeedback(true).then(function () {
                        var examToRecord = getReviewUpdate(exam, 'GRADED');
                        if (exam.state === 'GRADED' && $scope.isUnderLanguageInspection()) {
                            sendToRegistry(examToRecord, res, followUpUrl);
                        } else {
                            ExamRes.review.update({id: examToRecord.id}, examToRecord, function () {
                                if (exam.state !== 'GRADED') {
                                    toastr.info($translate.instant("sitnet_review_graded"));
                                }
                                sendToRegistry(examToRecord, res, followUpUrl);
                            }, function (error) {
                                toastr.error(error.data);
                            });
                        }
                    });
                };

                $scope.saveExamRecord = function (reviewedExam, followUpUrl, silent) {

                    if (!examReviewService.checkCredit(reviewedExam)) {
                        return;
                    }

                    var messages = [];
                    if (!reviewedExam.grade) {
                        if ($scope.selections.grade.id) {
                            reviewedExam.grade = {id: $scope.selections.grade.id};
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
                        var dialogNote, res;
                        if (reviewedExam.gradeless) {
                            dialogNote = !silent && $translate.instant('sitnet_confirm_archiving_without_grade');
                            res = ExamRes.register.add;
                        } else {
                            dialogNote = !silent && examReviewService.getRecordReviewConfirmationDialogContent(reviewedExam.examFeedback.comment);
                            res = ExamRes.saveRecord.add;
                        }
                        if (!silent) {
                            var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), dialogNote);
                            dialog.result.then(function () {
                                doRegister(reviewedExam, res, followUpUrl);
                            });
                        } else {
                            doRegister(reviewedExam, res, followUpUrl);
                        }

                    }
                };

                $scope.selectFile = function (isStatement) {

                    var exam = $scope.exam;
                    var ctrl = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {
                        $scope.exam = exam;
                        var urlSuffix = isStatement ? 'statement' : 'feedback';
                        var parent = isStatement ? $scope.exam.languageInspection.statement : $scope.exam.examFeedback;
                        fileService.getMaxFilesize().then(function (data) {
                            $scope.maxFileSize = data.filesize;
                        });
                        $scope.submit = function () {
                            fileService.upload("/app/attachment/exam/" + exam.id + "/" + urlSuffix, $scope.attachmentFile,
                                {examId: $scope.exam.id}, parent, $modalInstance);
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
                        console.log("closed");
                    });
                };

                // MATURITY RELATED ->

                $scope.isUnderLanguageInspection = function () {
                    return $scope.user.isLanguageInspector && $scope.exam && $scope.exam.languageInspection && !$scope.exam.languageInspection.finishedAt;
                };

                $scope.hasGoneThroughLanguageInspection = function () {
                    return $scope.exam && $scope.exam.languageInspection && $scope.exam.languageInspection.finishedAt;
                };

                $scope.isAwaitingInspection = function () {
                    return $scope.exam && $scope.exam.languageInspection && !$scope.exam.languageInspection.finishedAt;
                };

                $scope.canFinalizeInspection = function () {
                    return $scope.exam.languageInspection.statement && $scope.exam.languageInspection.statement.comment;
                };

                var MATURITY_STATES = {
                    NOT_REVIEWED: {id: 1, text: 'sitnet_not_reviewed'},
                    REJECT_STRAIGHTAWAY: {id: 2, text: 'sitnet_reject_maturity', canProceed: true, warn: true},
                    LANGUAGE_INSPECT: {id: 3, text: 'sitnet_send_for_language_inspection', canProceed: true},
                    AWAIT_INSPECTION: {id: 4, text: 'sitnet_await_inspection'},
                    REJECT_LANGUAGE: {
                        id: 5, text: 'sitnet_reject_maturity', canProceed: true, warn: true,
                        validate: $scope.canFinalizeInspection,
                        showHint: $scope.isMissingStatement,
                        hint: 'sitnet_missing_statement'
                    },
                    APPROVE_LANGUAGE: {
                        id: 6, text: 'sitnet_approve_maturity', canProceed: true,
                        validate: $scope.canFinalizeInspection,
                        showHint: $scope.isMissingStatement,
                        hint: 'sitnet_missing_statement'
                    },
                    MISSING_STATEMENT: {id: 9, text: 'sitnet_missing_statement'}
                };
                MATURITY_STATES.APPROVE_LANGUAGE.alternateState = MATURITY_STATES.REJECT_LANGUAGE;

                var isGraded = function () {
                    return $scope.exam.grade;
                };

                var isMissingFeedback = function () {
                    return !$scope.exam.examFeedback || !$scope.exam.examFeedback.comment;
                };

                $scope.isMissingStatement = function () {
                    if (!$scope.isUnderLanguageInspection()) {
                        return false;
                    }
                    return !$scope.exam.languageInspection.statement || !$scope.exam.languageInspection.statement.comment;
                };

                $scope.proceedWithMaturity = function (alternate) {
                    var state = $scope.getNextMaturityState();
                    if (state.alternateState && alternate) {
                        state = state.alternateState;
                    }
                    switch (state.id) {
                        case MATURITY_STATES.REJECT_STRAIGHTAWAY.id:
                            $scope.rejectMaturity(true);
                            break;
                        case MATURITY_STATES.LANGUAGE_INSPECT.id:
                            sendForLanguageInspection();
                            break;
                        case MATURITY_STATES.REJECT_LANGUAGE.id:
                        case MATURITY_STATES.APPROVE_LANGUAGE.id:
                            finalizeLanguageInspection();
                            break;
                        case MATURITY_STATES.AWAIT_INSPECTION.id:
                            // Nothing to do
                            break;
                        default:
                            // Nothing to do
                            break;
                    }
                };

                $scope.isMaturityRejection = function () {
                    return $scope.exam.executionType.type == 'MATURITY' &&
                        !$scope.exam.subjectToLanguageInspection &&
                        $scope.exam.grade &&
                        $scope.exam.grade.type &&
                        ['REJECTED', 'I', '0', 'NONE'].indexOf($scope.exam.grade.type) > -1;
                };

                $scope.getNextMaturityState = function () {
                    if (!isGraded()) {
                        return MATURITY_STATES.NOT_REVIEWED;
                    }
                    if (isMissingFeedback()) {
                        return MATURITY_STATES.MISSING_STATEMENT;
                    }
                    if ($scope.isUnderLanguageInspection()) {
                        return MATURITY_STATES.APPROVE_LANGUAGE;
                    }
                    if ($scope.isAwaitingInspection()) {
                        return MATURITY_STATES.AWAIT_INSPECTION;
                    }
                    var disapproved = !$scope.exam.grade || !$scope.exam.grade.type ||
                        ['REJECTED', 'I', '0', 'NONE'].indexOf($scope.exam.grade.type) > -1;

                    return disapproved ? MATURITY_STATES.REJECT_STRAIGHTAWAY :
                        MATURITY_STATES.LANGUAGE_INSPECT;
                };

                var doRejectMaturity = function (followUpUrl) {
                    $scope.saveFeedback(true).then(function () {
                        var params = getReviewUpdate($scope.exam, 'REJECTED');
                        ExamRes.review.update({id: $scope.exam.id}, params, function () {
                            toastr.info($translate.instant('sitnet_maturity_rejected'));
                            if (followUpUrl) {
                                $location.path(followUpUrl);
                            }
                            else if ($scope.user.isAdmin) {
                                $location.path("/");
                            } else {
                                $location.path("exams/examTabs/"+$scope.exam.parent.id+"/3");
                            }
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    });
                };

                $scope.rejectMaturity = function (askConfirmation, followUpUrl) {
                    if (askConfirmation) {
                        var dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                            $translate.instant('sitnet_confirm_maturity_disapproval'));
                        dialog.result.then(function () {
                            doRejectMaturity(followUpUrl);
                        });
                    } else {
                        doRejectMaturity(followUpUrl);
                    }
                };

                var sendForLanguageInspection = function () {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                        $translate.instant('sitnet_confirm_maturity_approval'));
                    dialog.result.then(function () {
                        $scope.saveFeedback(true).then(function () {
                            var params = getReviewUpdate($scope.exam, 'GRADED');
                            ExamRes.review.update({id: $scope.exam.id}, params, function () {
                                LanguageInspectionRes.inspection.add({examId: $scope.exam.id}, function () {
                                    toastr.info($translate.instant('sitnet_sent_for_language_inspection'));
                                    if ($scope.user.isAdmin) {
                                        $location.path("/");
                                    } else {
                                        $location.path("exams/examTabs/"+ $scope.exam.parent.idd+"/3");
                                    }
                                });
                            }, function (error) {
                                toastr.error(error.data);
                            });
                        });
                    });
                };

                var finalizeLanguageInspection = function () {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                        $translate.instant('sitnet_confirm_language_inspection_approval'));
                    dialog.result.then(function () {
                        var approved = $scope.exam.languageInspection.approved;
                        $scope.saveInspectionStatement().then(function () {
                            LanguageInspectionRes.approval.update(
                                {
                                    id: $scope.exam.languageInspection.id,
                                    approved: approved
                                },
                                function () {
                                    toastr.info($translate.instant('sitnet_language_inspection_finished'));
                                    if (approved) {
                                        $scope.saveExamRecord($scope.exam, "inspections", true);
                                    } else {
                                        $scope.rejectMaturity(false, "inspections");
                                    }
                                    //$location.path("inspections");
                                });
                        });
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
            };
        });
}());

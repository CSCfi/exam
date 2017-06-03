'use strict';
angular.module('app.review')
    .controller('SpeedReviewController', ['dialogs', '$q', '$route', '$routeParams', '$translate', 'ExamRes',
        'examService', 'examReviewService', 'fileService', '$uibModal', 'EXAM_CONF',
        function (dialogs, $q, $route, $routeParams, $translate, ExamRes,
                  examService, examReviewService, fileService, $modal, EXAM_CONF) {

            var ctrl = this;

            ctrl.reverse = false;
            ctrl.pageSize = 10;
            ctrl.eid = $routeParams.id;

            ctrl.showFeedbackEditor = function (exam) {
                examReviewService.showFeedbackEditor(exam);
            };

            ctrl.isAllowedToGrade = function (exam) {
                return examService.isOwnerOrAdmin(exam);
            };

            var getErrors = function (exam) {
                var messages = [];
                if (!ctrl.isAllowedToGrade(exam)) {
                    messages.push('sitnet_error_unauthorized');
                }
                if (!exam.creditType && !exam.examType) {
                    messages.push('sitnet_exam_choose_credit_type');
                }
                if (!exam.answerLanguage && exam.examLanguages.length !== 1) {
                    messages.push('sitnet_exam_choose_response_language');
                }
                return messages;
            };

            var gradeExam = function (review) {
                var deferred = $q.defer();
                var exam = review.exam;
                var messages = getErrors(exam);
                if (!exam.selectedGrade && !exam.grade.id) {
                    messages.push('sitnet_participation_unreviewed');
                }
                messages.forEach(function (msg) {
                    toastr.warning($translate.instant(msg));
                });
                if (messages.length === 0) {
                    var grade;
                    if (exam.selectedGrade.type === 'NONE') {
                        grade = undefined;
                        exam.gradeless = true;
                    } else {
                        grade = exam.selectedGrade.id ? exam.selectedGrade : exam.grade;
                        exam.gradeless = false;
                    }
                    var data = {
                        "id": exam.id,
                        "state": "GRADED",
                        "gradeless": exam.gradeless,
                        "grade": grade ? grade.id : undefined,
                        "customCredit": exam.customCredit,
                        "creditType": exam.creditType ? exam.creditType.type : exam.examType.type,
                        "answerLanguage": exam.answerLanguage ? exam.answerLanguage.code : exam.examLanguages[0].code
                    };
                    ExamRes.review.update({id: exam.id}, data, function () {
                        ctrl.examReviews.splice(ctrl.examReviews.indexOf(review), 1);
                        exam.gradedTime = new Date().getTime();
                        exam.grade = grade;
                        deferred.resolve();
                    }, function (error) {
                        toastr.error(error.data);
                        deferred.reject();
                    });
                } else {
                    deferred.reject();
                }
                return deferred.promise;
            };

            ctrl.isGradeable = function (exam) {
                return exam && getErrors(exam).length === 0;
            };

            ctrl.hasModifications = function () {
                if (ctrl.examReviews) {
                    return ctrl.examReviews.filter(function (r) {
                            return r.exam.selectedGrade &&
                                (r.exam.selectedGrade.id || r.exam.selectedGrade.type === 'NONE') &&
                                ctrl.isGradeable(r.exam);
                        }).length > 0;

                }
            };

            ctrl.gradeExams = function () {
                var reviews = ctrl.examReviews.filter(function (r) {
                    return r.exam.selectedGrade.type && ctrl.isGradeable(r.exam);
                });
                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_grade_review'));
                dialog.result.then(function (btn) {
                    var promises = [];
                    reviews.forEach(function (r) {
                        promises.push(gradeExam(r));
                    });
                    $q.all(promises).then(function () {
                        toastr.info($translate.instant('sitnet_saved'));
                    });
                });
            };

            ctrl.init = function () {
                var handleOngoingReviews = function (review) {
                    examReviewService.gradeExam(review.exam);
                    // FIXME: Seems evil
                    ExamRes.inspections.get({id: review.exam.id}, function (inspections) {
                        review.inspections = inspections;
                    });
                };

                ExamRes.exams.get({id: $routeParams.id}, function (exam) {
                    ctrl.examInfo = {
                        examOwners: exam.examOwners,
                        title: exam.course.code + " " + exam.name
                    };
                    ExamRes.examReviews.query({eid: $routeParams.id},
                        function (reviews) {
                            reviews.forEach(function (r) {
                                r.duration = moment.utc(Date.parse(r.duration)).format('HH:mm');
                                if (r.exam.languageInspection && !r.exam.languageInspection.finishedAt) {
                                    r.isUnderLanguageInspection = true;
                                }
                            });
                            ctrl.examReviews = reviews.filter(function (r) {
                                return r.exam.state === 'REVIEW' || r.exam.state === 'REVIEW_STARTED';
                            });
                            ctrl.examReviews.forEach(handleOngoingReviews);
                            ctrl.toggleReviews = ctrl.examReviews.length > 0;
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                });
            };

            ctrl.isOwner = function (user, owners) {
                var b = false;
                if (owners) {
                    angular.forEach(owners, function (owner) {
                        if ((owner.firstName + " " + owner.lastName) === (user.firstName + " " + user.lastName)) {
                            b = true;
                        }
                    });
                }
                return b;
            };

            ctrl.importGrades = function () {
                var modalCtrl = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {
                    fileService.getMaxFilesize().then(function (data) {
                        $scope.maxFileSize = data.filesize;
                    });
                    $scope.title = 'sitnet_import_grades_from_csv';
                    $scope.submit = function () {
                        fileService.upload("/app/gradeimport", $scope.attachmentFile, {}, null, $modalInstance,
                            $route.reload);
                    };
                    $scope.cancel = function () {
                        $modalInstance.dismiss('Canceled');
                    };
                }];

                var modalInstance = $modal.open({
                    templateUrl: EXAM_CONF.TEMPLATES_PATH + 'common/dialog_attachment_selection.html',
                    backdrop: 'static',
                    keyboard: true,
                    controller: modalCtrl
                });

                modalInstance.result.then(function () {
                    // OK button
                    console.log("closed");
                });
            };

            ctrl.createGradingTemplate = function () {
                var content = ctrl.examReviews.map(function (r) {
                    return [r.exam.id,
                            '',
                            '',
                            r.exam.totalScore + " / " + r.exam.maxScore,
                            r.user.firstName + " " + r.user.lastName,
                            r.user.userIdentifier]
                            .join() + ",\n";
                }).reduce(function (a, b) {
                    return a + b;
                }, "");
                content = "exam id,grade,feedback,total score,student,student id\n" + content;
                var blob = new Blob([content], {type: "text/csv;charset=utf-8"});
                saveAs(blob, "grading.csv");
            };


        }
    ]);


/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.review')
    .component('speedReview', {
        templateUrl: '/assets/app/review/listing/speedReview.template.html',
        controller: ['dialogs', '$q', '$route', '$routeParams', '$translate', 'ExamRes', 'Exam',
            'ReviewList', 'Files', '$uibModal', 'EXAM_CONF', 'toast',
            function (dialogs, $q, $route, $routeParams, $translate, ExamRes,
                      Exam, ReviewList, Files, $modal, EXAM_CONF, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.pageSize = 10;
                    vm.eid = $routeParams.id;

                    ExamRes.exams.get({id: $routeParams.id}, function (exam) {
                        vm.examInfo = {
                            examOwners: exam.examOwners,
                            title: exam.course.code + ' ' + exam.name
                        };
                        ExamRes.examReviews.query({eid: $routeParams.id},
                            function (reviews) {
                                reviews.forEach(function (r) {
                                    r.duration = moment.utc(Date.parse(r.duration)).format('HH:mm');
                                    if (r.exam.languageInspection && !r.exam.languageInspection.finishedAt) {
                                        r.isUnderLanguageInspection = true;
                                    }
                                });
                                vm.examReviews = reviews.filter(function (r) {
                                    return r.exam.state === 'REVIEW' || r.exam.state === 'REVIEW_STARTED';
                                });
                                vm.examReviews.forEach(handleOngoingReviews);
                                vm.toggleReviews = vm.examReviews.length > 0;
                            },
                            function (error) {
                                toast.error(error.data);
                            }
                        );
                    });
                };

                vm.showFeedbackEditor = function (exam) {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        component: 'reviewFeedback',
                        resolve: {
                            exam: function () {
                                return exam;
                            }
                        }
                    });
                };

                vm.isAllowedToGrade = function (exam) {
                    return Exam.isOwnerOrAdmin(exam);
                };

                var getErrors = function (exam) {
                    var messages = [];
                    if (!vm.isAllowedToGrade(exam)) {
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
                        toast.warning($translate.instant(msg));
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
                            'id': exam.id,
                            'state': 'GRADED',
                            'gradeless': exam.gradeless,
                            'grade': grade ? grade.id : undefined,
                            'customCredit': exam.customCredit,
                            'creditType': exam.creditType ? exam.creditType.type : exam.examType.type,
                            'answerLanguage': exam.answerLanguage ? exam.answerLanguage.code : exam.examLanguages[0].code
                        };
                        ExamRes.review.update({id: exam.id}, data, function () {
                            vm.examReviews.splice(vm.examReviews.indexOf(review), 1);
                            exam.gradedTime = new Date().getTime();
                            exam.grade = grade;
                            deferred.resolve();
                        }, function (error) {
                            toast.error(error.data);
                            deferred.reject();
                        });
                    } else {
                        deferred.reject();
                    }
                    return deferred.promise;
                };

                vm.isGradeable = function (exam) {
                    return exam && getErrors(exam).length === 0;
                };

                vm.hasModifications = function () {
                    if (vm.examReviews) {
                        return vm.examReviews.filter(function (r) {
                                return r.exam.selectedGrade &&
                                    (r.exam.selectedGrade.id || r.exam.selectedGrade.type === 'NONE') &&
                                    vm.isGradeable(r.exam);
                            }).length > 0;

                    }
                };

                vm.gradeExams = function () {
                    var reviews = vm.examReviews.filter(function (r) {
                        return r.exam.selectedGrade && r.exam.selectedGrade.type && vm.isGradeable(r.exam);
                    });
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_grade_review'));
                    dialog.result.then(function (btn) {
                        var promises = [];
                        reviews.forEach(function (r) {
                            promises.push(gradeExam(r));
                        });
                        $q.all(promises).then(function () {
                            toast.info($translate.instant('sitnet_saved'));
                        });
                    });
                };

                vm.isOwner = function (user, owners) {
                    var b = false;
                    if (owners) {
                        angular.forEach(owners, function (owner) {
                            if ((owner.firstName + ' ' + owner.lastName) === (user.firstName + ' ' + user.lastName)) {
                                b = true;
                            }
                        });
                    }
                    return b;
                };

                vm.importGrades = function () {
                    var ctrl = ['$scope', '$uibModalInstance', function ($scope, $modalInstance) {
                        Files.getMaxFilesize().then(function (data) {
                            $scope.maxFileSize = data.filesize;
                        });
                        $scope.title = 'sitnet_import_grades_from_csv';
                        $scope.submit = function () {
                            Files.upload('/app/gradeimport', $scope.attachmentFile, {}, null, $modalInstance,
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
                        controller: ctrl
                    });

                    modalInstance.result.then(function () {
                        // OK button
                        console.log('closed');
                    });
                };

                vm.createGradingTemplate = function () {
                    var content = vm.examReviews.map(function (r) {
                        return [r.exam.id,
                                '',
                                '',
                                r.exam.totalScore + ' / ' + r.exam.maxScore,
                                r.user.firstName + ' ' + r.user.lastName,
                                r.user.userIdentifier]
                                .join() + ',\n';
                    }).reduce(function (a, b) {
                        return a + b;
                    }, '');
                    content = 'exam id,grade,feedback,total score,student,student id\n' + content;
                    var blob = new Blob([content], {type: 'text/csv;charset=utf-8'});
                    saveAs(blob, 'grading.csv');
                };

                var handleOngoingReviews = function (review) {
                    ReviewList.gradeExam(review.exam);
                    // FIXME: Seems evil
                    ExamRes.inspections.get({id: review.exam.id}, function (inspections) {
                        review.inspections = inspections;
                    });
                };

            }
        ]
    });


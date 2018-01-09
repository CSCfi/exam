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

import angular from 'angular';
import toast from 'toastr';
import moment from 'moment';
import FileSaver from 'filesaver.js';

angular.module('app.review')
    .component('speedReview', {
        template: require('./speedReview.template.html'),
        controller: ['dialogs', '$q', '$route', '$routeParams', '$translate', 'ExamRes', 'Exam',
            'ReviewList', 'Files', '$uibModal',
            function (dialogs, $q, $route, $routeParams, $translate, ExamRes,
                      Exam, ReviewList, Files, $modal) {

                const vm = this;

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

                const getErrors = function (exam) {
                    const messages = [];
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

                const gradeExam = function (review) {
                    const deferred = $q.defer();
                    const exam = review.exam;
                    const messages = getErrors(exam);
                    if (!exam.selectedGrade && !exam.grade.id) {
                        messages.push('sitnet_participation_unreviewed');
                    }
                    messages.forEach(function (msg) {
                        toast.warning($translate.instant(msg));
                    });
                    if (messages.length === 0) {
                        let grade;
                        if (exam.selectedGrade.type === 'NONE') {
                            grade = undefined;
                            exam.gradeless = true;
                        } else {
                            grade = exam.selectedGrade.id ? exam.selectedGrade : exam.grade;
                            exam.gradeless = false;
                        }
                        const data = {
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
                    const reviews = vm.examReviews.filter(function (r) {
                        return r.exam.selectedGrade && r.exam.selectedGrade.type && vm.isGradeable(r.exam);
                    });
                    const dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_grade_review'));
                    dialog.result.then(function () {
                        const promises = [];
                        reviews.forEach(function (r) {
                            promises.push(gradeExam(r));
                        });
                        $q.all(promises).then(function () {
                            toast.info($translate.instant('sitnet_saved'));
                        });
                    });
                };

                vm.isOwner = function (user, owners) {
                    if (owners) {
                        return owners.some(o => o.firstName + o.lastName === user.firstName + user.lastName);
                    }
                    return false;
                };

                vm.importGrades = function () {

                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        animation: true,
                        component: 'attachmentSelector',
                        resolve: {title: function () { return 'sitnet_import_grades_from_csv';}}
                    }).result.then(function () {
                        $route.reload();
                    });

                };

                vm.createGradingTemplate = function () {
                    const rows = vm.examReviews.map(function (r) {
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
                    const content = 'exam id,grade,feedback,total score,student,student id\n' + rows;
                    const blob = new Blob([content], {type: 'text/csv;charset=utf-8'});
                    FileSaver.saveAs(blob, 'grading.csv');
                };

                const handleOngoingReviews = function (review) {
                    ReviewList.gradeExam(review.exam);
                    // FIXME: Seems evil
                    ExamRes.inspections.get({id: review.exam.id}, function (inspections) {
                        review.inspections = inspections;
                    });
                };

            }
        ]
    });


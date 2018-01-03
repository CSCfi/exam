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

angular.module('app.review')
    .component('reviewList', {
        template: require('./reviewList.template.html'),
        bindings: {
            exam: '<'
        },
        controller: ['$filter', '$q', '$translate', '$uibModal', 'dialogs', 'ExamRes', 'DateTime', 'Exam',
            'ReviewList', 'Files', 'EXAM_CONF', 'diffInMinutesToFilter',
            function ($filter, $q, $translate, $modal, dialogs, ExamRes, DateTime, Exam, Review,
                      Files, EXAM_CONF, diffInMinutesToFilter) {

                const vm = this;

                vm.applyFreeSearchFilter = function (key) {
                    const text = vm.data[key].filter;
                    const target = vm.data[key].items;
                    vm.data[key].filtered = Review.applyFilter(text, target);
                };

                const prepareView = function (items, view, setup) {
                    items.forEach(setup);
                    vm.data[view].items = vm.data[view].filtered = items;
                    vm.data[view].toggle = items.length > 0;
                };

                const filterByState = function (reviews, states) {
                    return reviews.filter(function (r) {
                        return states.indexOf(r.exam.state) > -1;
                    });
                };

                vm.$onInit = function () {
                    vm.pageSize = 30;

                    vm.templates = {
                        reviewStartedPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/review_started.html',
                        languageInspectionPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/language_inspection.html',
                        gradedPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/graded.html',
                        gradedLoggedPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/graded_logged.html',
                        rejectedPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/rejected.html',
                        archivedPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/archived.html'
                    };

                    vm.selections = {graded: {all: false, page: false}, gradedLogged: {all: false, page: false}};

                    vm.data = {
                        started: {predicate: 'deadline'},
                        graded: {predicate: 'deadline'},
                        finished: {predicate: 'displayedGradingTime'},
                        inspected: {predicate: 'deadline'},
                        rejected: {predicate: 'displayedGradingTime'},
                        archived: {predicate: 'displayedGradingTime'}
                    };

                    ExamRes.examReviews.query({eid: vm.exam.id},
                        function (reviews) {
                            reviews.forEach(function (r) {
                                r.duration = diffInMinutesToFilter(r.started, r.ended);
                                if (r.exam.languageInspection && !r.exam.languageInspection.finishedAt) {
                                    r.isUnderLanguageInspection = true;
                                }
                            });

                            // ABORTED
                            vm.abortedExams = filterByState(reviews, ['ABORTED']);
                            // REVIEW STARTED
                            prepareView(filterByState(reviews, ['REVIEW', 'REVIEW_STARTED']), 'started', handleOngoingReviews);
                            // FINISHED
                            prepareView(filterByState(reviews, ['GRADED_LOGGED']), 'finished', handleGradedReviews);
                            // REJECTED
                            prepareView(filterByState(reviews, ['REJECTED']), 'rejected', handleGradedReviews);
                            // ARCHIVED
                            prepareView(filterByState(reviews, ['ARCHIVED']), 'archived', handleGradedReviews);
                            // GRADED
                            const gradedReviews = reviews.filter(function (r) {
                                return r.exam.state === 'GRADED' &&
                                    (!r.exam.languageInspection || r.exam.languageInspection.finishedAt);
                            });
                            prepareView(gradedReviews, 'graded', handleGradedReviews);
                            // IN LANGUAGE INSPECTION
                            const inspections = reviews.filter(function (r) {
                                return r.exam.state === 'GRADED' && r.exam.languageInspection &&
                                    !r.exam.languageInspection.finishedAt;
                            });
                            prepareView(inspections, 'inspected', handleGradedReviews);

                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );

                    // No-shows
                    ExamRes.noShows.query({eid: vm.exam.id}, function (noShows) {
                        vm.noShows = noShows;
                    });
                };

                vm.translateGrade = function (exam) {
                    const grade = exam.grade ? exam.grade.name : 'NONE';
                    return Exam.getExamGradeDisplayName(grade);
                };

                vm.selectAll = function (name, items) {
                    const override = resetSelections(name, 'all');
                    items.forEach(function (i) {
                        i.selected = !i.selected || override;
                    });
                };

                vm.selectPage = function (name, items, boxClass) {
                    const override = resetSelections(name, 'page');
                    const boxes = angular.element('.' + boxClass);
                    const ids = [];
                    angular.forEach(boxes, function (input) {
                        ids.push(parseInt(angular.element(input).val()));
                    });
                    // init all as not selected
                    if (override) {
                        items.forEach(function (i) {
                            i.selected = false;
                        });
                    }
                    const pageItems = items.filter(function (i) {
                        return ids.indexOf(i.exam.id) > -1;
                    });
                    pageItems.forEach(function (pi) {
                        pi.selected = !pi.selected || override;
                    });
                };

                vm.archiveSelected = function () {
                    const selection = getSelectedReviews(vm.data.finished.filtered);
                    if (!selection) {
                        return;
                    }
                    const ids = selection.map(function (r) {
                        return r.exam.id;
                    });
                    ExamRes.archive.update({ids: ids.join()}, function () {
                        vm.data.finished.items = vm.data.finished.items.filter(function (r) {
                            if (ids.indexOf(r.exam.id) > -1) {
                                vm.data.archived.items.push(r);
                                return false;
                            }
                            return true;
                        });
                        vm.applyFreeSearchFilter('archived');
                        vm.applyFreeSearchFilter('finished');
                        toast.info($translate.instant('sitnet_exams_archived'));
                    });
                };

                vm.sendSelectedToRegistry = function () {
                    const selection = getSelectedReviews(vm.data.graded.filtered);
                    if (!selection) {
                        return;
                    }
                    const dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_record_review'));

                    dialog.result.then(function (btn) {
                        const promises = [];
                        selection.forEach(function (r) {
                            promises.push(send(r));
                        });
                        $q.all(promises).then(function () {
                            toast.info($translate.instant('sitnet_results_send_ok'));
                        });
                    });
                };

                vm.printSelected = function (asReport) {
                    const selection = getSelectedReviews(vm.data.finished.filtered);
                    if (!selection) {
                        return;
                    }
                    let url = '/app/exam/record/export/';
                    if (asReport) {
                        url += 'report/';
                    }
                    const fileType = asReport ? '.xlsx' : '.csv';
                    const ids = selection.map(function (r) {
                        return r.exam.id;
                    });

                    Files.download(url + vm.exam.id,
                        $translate.instant('sitnet_grading_info') + '_' + $filter('date')(Date.now(), 'dd-MM-yyyy') + fileType,
                        {'childIds': ids}, true
                    );
                };

                const resetSelections = function (name, view) {
                    const scope = vm.selections[name];
                    let prev, next;
                    for (let k in scope) {
                        if (scope.hasOwnProperty(k)) {
                            if (k === view) {
                                scope[k] = !scope[k];
                                next = scope[k];
                            } else {
                                if (scope[k]) {
                                    prev = true;
                                }
                                scope[k] = false;
                            }
                        }
                    }
                    return prev && next;
                };

                const getSelectedReviews = function (items) {
                    const objects = items.filter(function (i) {
                        return i.selected;
                    });
                    if (objects.length === 0) {
                        toast.warning($translate.instant('sitnet_choose_atleast_one'));
                        return;
                    }
                    return objects;
                };

                const send = function (review) {
                    const deferred = $q.defer();
                    const exam = review.exam;
                    const resource = exam.gradeless ? ExamRes.register : ExamRes.saveRecord;
                    if ((exam.grade || exam.gradeless) && exam.creditType && exam.answerLanguage) {
                        const examToRecord = {
                            'id': exam.id,
                            'state': 'GRADED_LOGGED',
                            'grade': exam.grade,
                            'customCredit': exam.customCredit,
                            'totalScore': exam.totalScore,
                            'creditType': exam.creditType,
                            'sendFeedback': true,
                            'answerLanguage': exam.answerLanguage
                        };

                        resource.add(examToRecord, function () {
                            review.selected = false;
                            review.displayedGradingTime = review.exam.languageInspection ?
                                review.exam.languageInspection.finishedAt : review.exam.gradedTime;
                            vm.data.graded.items.splice(vm.data.graded.items.indexOf(review), 1);
                            vm.data.finished.items.push(review);
                            vm.applyFreeSearchFilter('graded');
                            vm.applyFreeSearchFilter('finished');
                            deferred.resolve();
                        });
                    } else {
                        toast.error($translate.instant('sitnet_failed_to_record_review'));
                        deferred.reject();
                    }
                    return deferred.promise;
                };

                const handleOngoingReviews = function (review) {
                    Review.gradeExam(review.exam);
                    ExamRes.inspections.get({id: review.exam.id}, function (inspections) {
                        review.inspections = inspections;
                    });
                };

                const  handleGradedReviews = function (r) {
                    r.displayedGradingTime = r.exam.languageInspection ?
                        r.exam.languageInspection.finishedAt : r.exam.gradedTime;
                    r.displayedGrade = vm.translateGrade(r.exam);
                    r.displayedCredit = vm.printExamCredit(r.exam.course.credits, r.exam.customCredit);
                };

                vm.printExamCredit = function (courseCredit, customCredit) {
                    return customCredit ? customCredit : courseCredit;
                };

                vm.printExamDuration = function (exam) {
                    return DateTime.printExamDuration(exam);
                };

                vm.getAnswerAttachments = function () {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        animation: true,
                        component: 'archiveDownload'
                    }).result.then(function (params) {
                        Files.download(
                            '/app/exam/' + vm.exam.id + '/attachments', vm.exam.id + '.tar.gz', params);
                    });
                };

                vm.openAborted = function () {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        windowClass: 'question-editor-modal',
                        component: 'abortedExams',
                        resolve: {
                            abortedExams: function () {
                                return vm.abortedExams;
                            }
                        }
                    });
                };

                vm.openNoShows = function () {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        windowClass: 'question-editor-modal',
                        component: 'noShows',
                        resolve: {
                            noShows: function () {
                                return vm.noShows;
                            }
                        }
                    });
                };

            }
        ]
    });


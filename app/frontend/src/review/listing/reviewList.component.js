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

                vm.$onInit = function () {

                    ExamRes.examReviews.query({eid: vm.exam.id},
                        function (reviews) {
                            reviews.forEach(function (r) {
                                r.duration = diffInMinutesToFilter(r.started, r.ended);
                                if (r.exam.languageInspection && !r.exam.languageInspection.finishedAt) {
                                    r.isUnderLanguageInspection = true;
                                }
                            });
                            vm.reviews = reviews;
                            vm.abortedExams = filterByState(reviews, ['ABORTED']);
                            vm.inProgressReviews = filterByState(reviews, ['REVIEW', 'REVIEW_STARTED']);
                            vm.gradedReviews = reviews.filter(function (r) {
                                return r.exam.state === 'GRADED' &&
                                    (!r.exam.languageInspection || r.exam.languageInspection.finishedAt);
                            });
                            vm.gradedLoggedReviews = filterByState(reviews, ['GRADED_LOGGED']);
                            vm.archivedReviews = filterByState(reviews, ['ARCHIVED']);
                            vm.languageInspectedReviews = reviews.filter(function (r) {
                                return r.exam.state === 'GRADED' && r.exam.languageInspection &&
                                    !r.exam.languageInspection.finishedAt;
                            });
                            vm.rejectedReviews = filterByState(reviews, ['REJECTED']);
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

                vm.onArchive = function (reviews) {
                    const ids = reviews.map(r => r.id);
                    const archived = vm.gradedLoggedReviews.filter(glr => ids.indexOf(glr.id) > -1);
                    vm.archivedReviews = vm.archivedReviews.concat(archived);
                    vm.gradedLoggedReviews = vm.gradedLoggedReviews.filter(glr => ids.indexOf(glr.id) === -1);
                };

                vm.onRegistration = function (reviews) {
                    reviews.forEach((r) => {
                        const index = vm.gradedReviews.map(gr => gr.id).indexOf(r.id);
                        vm.gradedReviews.splice(index, 1);
                        r.selected = false;
                        r.displayedGradingTime = r.exam.languageInspection ?
                            r.exam.languageInspection.finishedAt : r.exam.gradedTime;
                        vm.gradedLoggedReviews.push(r);
                    });
                    vm.gradedReviews = angular.copy(vm.gradedReviews);
                    vm.gradedLoggedReviews = angular.copy(vm.gradedLoggedReviews);
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

                const filterByState = function (reviews, states) {
                    return reviews.filter(function (r) {
                        return states.indexOf(r.exam.state) > -1;
                    });
                };


            }
        ]
    });


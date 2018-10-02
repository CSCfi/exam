/*
 * Copyright (c) 2018 Exam Consortium
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
    .component('rlGraded', {
        template: require('./graded.template.html'),
        bindings: {
            exam: '<',
            reviews: '<',
            onRegistered: '&'
        },
        require: {
            parentCtrl: '^^reviewList'
        },
        controller: ['$q', '$translate', 'dialogs', 'ReviewList', 'Exam', 'Session',
            function ($q, $translate, dialogs, ReviewList, Exam, Session) {

                const vm = this;

                const init = function () {
                    vm.data = ReviewList.prepareView(vm.reviews, handleGradedReviews);
                    vm.data.predicate = 'deadline';

                    vm.selections = { all: false, page: false };
                };

                vm.$onInit = function () {
                    init();
                    vm.isOwner = (user) =>
                        vm.exam.examOwners.some(o => o.firstName + o.lastName === user.firstName + user.lastName);
                };

                vm.$onChanges = function (props) {
                    if (props.reviews) {
                        init();
                        vm.applyFreeSearchFilter();
                    }
                };

                vm.showId = () => Session.getUser().isAdmin && vm.exam.anonymous;

                vm.applyFreeSearchFilter = () =>
                    vm.data.filtered = ReviewList.applyFilter(vm.data.filter, vm.data.items);

                vm.sendSelectedToRegistry = () => {
                    const selection = ReviewList.getSelectedReviews(vm.data.filtered);
                    if (!selection) {
                        return;
                    }
                    const dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                        $translate.instant('sitnet_confirm_record_review'));
                    const examId = vm.parentCtrl.collaborative ? vm.exam.id : undefined;

                    dialog.result.then(function (btn) {
                        const promises = [];
                        selection.forEach(function (r) {
                            promises.push(ReviewList.sendToRegistry(r, examId));
                        });
                        $q.all(promises).then(function () {
                            vm.onRegistered({ reviews: selection });
                            toast.info($translate.instant('sitnet_results_send_ok'));
                        });
                    });
                };

                vm.getLinkToAssessment = (review) =>
                    vm.parentCtrl.collaborative ? `/assessments/collaborative/${vm.exam.id}/${review._id}`
                        : `/assessments/${review.exam.id}`

                vm.pageSelected = function (page) {
                    vm.currentPage = page;
                }

                vm.selectAll = () =>
                    ReviewList.selectAll(vm.selections, vm.data.filtered);

                vm.selectPage = (selector) =>
                    ReviewList.selectPage(vm.selections, vm.data.filtered, selector);

                const translateGrade = (exam) => {
                    const grade = exam.grade ? exam.grade.name : 'NONE';
                    return Exam.getExamGradeDisplayName(grade);
                };

                const examCredit = (courseCredit, customCredit) => customCredit ? customCredit : courseCredit;

                const handleGradedReviews = r => {
                    r.displayName = ReviewList.getDisplayName(r, vm.parentCtrl.collaborative);
                    r.displayedGradingTime = r.exam.languageInspection ?
                        r.exam.languageInspection.finishedAt : r.exam.gradedTime;
                    r.displayedGrade = translateGrade(r.exam);
                    r.displayedCredit = examCredit(r.exam.course ? r.exam.course.credits : 0, r.exam.customCredit);
                };

            }]
    });

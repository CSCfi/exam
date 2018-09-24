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
    .component('rlGradedLogged', {
        template: require('./gradedLogged.template.html'),
        bindings: {
            reviews: '<',
            onArchive: '&',
            exam: '<'
        },
        require: {
            parentCtrl: '^^reviewList'
        },
        controller: ['$q', '$filter', '$translate', 'dialogs', 'ReviewList', 'Files', 'Exam', 'ExamRes', 'Session',
            function ($q, $filter, $translate, dialogs, ReviewList, Files, Exam, ExamRes, Session) {

                const vm = this;

                const init = function () {
                    vm.data = ReviewList.prepareView(vm.reviews, handleGradedReviews);
                    vm.data.predicate = 'started';
                    vm.data.reverse = true;

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

                vm.pageSelected = function (page) {
                    vm.currentPage = page;
                }

                vm.applyFreeSearchFilter = () =>
                    vm.data.filtered = ReviewList.applyFilter(vm.data.filter, vm.data.items);

                vm.archiveSelected = function () {
                    const selection = ReviewList.getSelectedReviews(vm.data.filtered);
                    if (!selection) {
                        return;
                    }
                    const ids = selection.map(r => r.exam.id);
                    ExamRes.archive.update({ ids: ids.join() }, function () {
                        vm.onArchive({ reviews: selection });
                        toast.info($translate.instant('sitnet_exams_archived'));
                    });
                };

                vm.printSelected = function (asReport) {
                    const selection = ReviewList.getSelectedReviews(vm.data.filtered);
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
                        { 'childIds': ids }, true
                    );
                };

                vm.getLinkToAssessment = (review) =>
                    vm.parentCtrl.collaborative ? `/assessments/collaborative/${vm.exam.id}/${review._id}`
                        : `/assessments/${review.exam.id}`

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

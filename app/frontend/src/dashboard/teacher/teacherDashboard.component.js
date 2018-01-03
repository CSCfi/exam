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

angular.module('app.dashboard.teacher')
    .component('teacherDashboard', {
        template: require('./teacherDashboard.template.html'),
        controller: ['$location', '$filter', 'TeacherDashboard', 'Session',
            function ($location, $filter, TeacherDashboard, Session) {

                const vm = this;

                vm.$onInit = function () {
                    vm.activeTab = $location.search().tab ? parseInt($location.search().tab) : 1;
                    vm.userId = Session.getUser().id;
                    vm.activeExtraColumns = [
                        {
                            text: 'sitnet_participation_unreviewed',
                            property: 'unassessedCount',
                            link: '/exams/__/4',
                            checkOwnership: true
                        }, {
                            text: 'sitnet_participation_unfinished',
                            property: 'unfinishedCount',
                            link: '/exams/__/4',
                            checkOwnership: true
                        }, {
                            text: 'sitnet_dashboard_title_waiting_reservation',
                            property: 'reservationCount',
                            link: '/reservations/__'
                        }
                    ];
                    vm.finishedExtraColumns = [
                        {
                            text: 'sitnet_participation_unreviewed',
                            property: 'unassessedCount',
                            link: '/exams/__/4',
                            checkOwnership: true
                        }, {
                            text: 'sitnet_participation_unfinished',
                            property: 'unfinishedCount',
                            link: '/exams/__/4',
                            checkOwnership: true
                        }
                    ];
                    vm.archivedExtraColumns = [
                        {
                            text: 'sitnet_participation_unreviewed',
                            property: 'assessedCount',
                            link: '/exams/__/4',
                            checkOwnership: true
                        }
                    ];
                    vm.draftExtraColumns = [];

                    TeacherDashboard.populate(vm).then(function () {
                        vm.filteredFinished = vm.finishedExams;
                        vm.filteredActive = vm.activeExams;
                        vm.filteredArchived = vm.archivedExams;
                        vm.filteredDrafts = vm.draftExams;
                    });
                };

                vm.changeTab = function (index) {
                    $location.search('tab', index);
                };

                vm.search = function (text) {

                    // Use same search parameter for all the 4 result tables
                    vm.filteredFinished = $filter('filter')(vm.finishedExams, text);
                    vm.filteredActive = $filter('filter')(vm.activeExams, text);
                    vm.filteredArchived = $filter('filter')(vm.archivedExams, text);
                    vm.filteredDrafts = $filter('filter')(vm.draftExams, text);

                    // for drafts, display exams only for owners AM-1658
                    vm.filteredDrafts = vm.filteredDrafts.filter(function (exam) {
                        return exam.examOwners.some(eo => eo.id === vm.userId);
                    });

                    // for finished, display exams only for owners OR if exam has unassessed reviews AM-1658
                    vm.filteredFinished = vm.filteredFinished.filter(function (exam) {
                        return exam.unassessedCount > 0 || exam.examOwners.some(eo => eo.id === vm.userId);
                    });

                    // for active, display exams only for owners OR if exam has unassessed reviews AM-1658
                    vm.filteredActive = vm.filteredActive.filter(function (exam) {
                        return exam.unassessedCount > 0 || exam.examOwners.some(eo => eo.id === vm.userId);
                    });
                };

            }]
    });

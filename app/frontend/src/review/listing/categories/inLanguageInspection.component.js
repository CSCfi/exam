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

angular.module('app.review')
    .component('rlInLanguageInspection', {
        template: require('./inLanguageInspection.template.html'),
        bindings: {
            reviews: '<'
        },
        controller: ['ReviewList', 'Exam', function (ReviewList, Exam) {

            const vm = this;

            vm.$onInit = function () {
                vm.data = ReviewList.prepareView(vm.reviews, handleGradedReviews);
                vm.data.predicate = 'deadline';

                vm.isOwner = (user) =>
                    vm.exam.examOwners.some(o => o.firstName + o.lastName === user.firstName + user.lastName);

            };

            vm.applyFreeSearchFilter = () =>
                vm.data.filtered = ReviewList.applyFilter(vm.data.filter, vm.data.items);

            const translateGrade = (exam) => {
                const grade = exam.grade ? exam.grade.name : 'NONE';
                return Exam.getExamGradeDisplayName(grade);
            };

            const examCredit = (courseCredit, customCredit) => customCredit ? customCredit : courseCredit;

            const handleGradedReviews = r => {
                r.displayedGradingTime = r.exam.languageInspection ?
                    r.exam.languageInspection.finishedAt : r.exam.gradedTime;
                r.displayedGrade = translateGrade(r.exam);
                r.displayedCredit = examCredit(r.exam.course.credits, r.exam.customCredit);
            };


        }]
    });

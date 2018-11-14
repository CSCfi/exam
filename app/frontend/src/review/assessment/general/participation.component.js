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

angular.module('app.review')
    .component('rParticipation', {
        template: require('./participation.template.html'),
        bindings: {
            participation: '<',
            collaborative: '<'
        },
        controller: ['Exam', 'Session', '$routeParams',
            function (Exam, Session, $routeParams) {

                const vm = this;

                vm.viewAnswers = function () {
                    let url = '/assessments/' + vm.participation.exam.id;
                    if (vm.collaborative) {
                        url = `/assessments/collaborative/${$routeParams.id}/${vm.participation._id}`
                    }
                    window.open(url, '_blank');
                };

                vm.hideGrade = function () {
                    return vm.participation.noShow || !vm.participation.exam.grade;
                };

                vm.hideAnswerLink = function () {
                    const anonymous = (vm.participation.collaborativeExam && vm.participation.collaborativeExam.anonymous)
                        || vm.participation.exam.anonymous
                    return vm.participation.exam.state === 'ABORTED' || vm.participation.noShow ||
                        (anonymous && !Session.getUser().isAdmin);
                };

                vm.translateGrade = function () {
                    if (vm.hideGrade()) {
                        return;
                    }
                    return Exam.getExamGradeDisplayName(vm.participation.exam.grade.name);
                };

            }

        ]
    });

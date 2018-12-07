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
    .component('rMaturityToolbar', {
        template: require('./toolbar.template.html'),
        bindings: {
            exam: '<',
            valid: '<'
        },
        controller: ['$translate', 'Maturity', 'Assessment', 'Session', 'Exam',
            function ($translate, Maturity, Assessment, Session, Exam) {

                const vm = this;

                vm.isOwnerOrAdmin = function () {
                    return Exam.isOwnerOrAdmin(vm.exam);
                };

                vm.isReadOnly = function () {
                    return Assessment.isReadOnly(vm.exam);
                };

                vm.isUnderLanguageInspection = function () {
                    return Session.getUser().isLanguageInspector &&
                        vm.exam.languageInspection &&
                        !vm.exam.languageInspection.finishedAt;
                };

                vm.saveAssessment = function () {
                    Assessment.saveAssessment(vm.exam, vm.isOwnerOrAdmin());
                };

                vm.getNextState = function () {
                    return Maturity.getNextState(vm.exam);
                };

                vm.proceed = function (alternate) {
                    Maturity.proceed(vm.exam, alternate);
                };

                vm.isMissingStatement = function () {
                    return Maturity.isMissingStatement(vm.exam);
                };

            }

        ]
    });

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

angular.module('app.exam.editor')
    .component('examOwnerSelector', {
        template: require('./examOwnerSelector.template.html'),
        bindings: {
            exam: '<'
        },
        controller: ['$translate', 'limitToFilter', 'ExamRes', 'UserRes',
            function ($translate, limitToFilter, ExamRes, UserRes) {

                const vm = this;

                vm.$onInit = function () {
                    vm.newOwner = {
                        "id": null,
                        "name": null,
                        "email": null
                    };
                    vm.examOwners = getExamOwners();
                };
                // TODO: collaborative exam case, need to be able to add by email, check the pre-enrolment case?
                vm.allExamOwners = function (filter, criteria) {

                    return UserRes.filterOwnersByExam.query({
                        role: 'TEACHER',
                        eid: vm.exam.id,
                        q: criteria
                    }).$promise.then(
                        function (names) {
                            return limitToFilter(names, 15);
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                        );
                };

                vm.setExamOwner = function ($item, $model, $label) {
                    vm.newOwner.id = $item.id;
                };

                vm.addExamOwner = function () {
                    if (vm.newOwner.id > 0) {
                        ExamRes.examowner.insert({
                            eid: vm.exam.id,
                            uid: vm.newOwner.id
                        }, function () {
                            getExamOwners();
                            // clear input field
                            delete vm.newOwner.email;
                            delete vm.newOwner.name;
                            delete vm.newOwner.id;
                        }, function (error) {
                            toast.error(error.data);
                        });
                    } else {
                        toast.error($translate.instant('sitnet_teacher_not_found'));
                    }
                };

                vm.removeOwner = function (id) {
                    ExamRes.examowner.remove({ eid: vm.exam.id, uid: id },
                        function () {
                            getExamOwners();
                        },
                        function (error) {
                            toast.error(error.data);
                        });
                };

                function getExamOwners() {
                    ExamRes.owners.query({ id: vm.exam.id },
                        function (examOwners) {
                            vm.examOwners = examOwners;
                        },
                        function (error) {
                            toast.error(error.data);
                        });

                }


            }]
    });

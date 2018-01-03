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

import toast from 'toastr';

angular.module('app.software')
    .component('software', {
        template: require('./software.template.html'),
        controller: ['SoftwareRes', '$translate',
            function (SoftwareRes, $translate) {

                const vm = this;

                vm.$onInit = function () {
                    vm.softwares = SoftwareRes.softwares.query();
                };

                vm.updateSoftware = function (software) {
                    SoftwareRes.update.update({id: software.id}, software,
                        function (updated_software) {
                            software = updated_software;
                            toast.info($translate.instant('sitnet_software_updated'));
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.addSoftware = function (name) {
                    SoftwareRes.add.insert({name: name}, function (software) {
                            toast.info($translate.instant('sitnet_software_added'));
                            vm.softwares.push(software);
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.removeSoftware = function (software) {
                    SoftwareRes.software.remove({id: software.id},
                        function () {
                            toast.info($translate.instant('sitnet_software_removed'));
                            if (vm.softwares.indexOf(software) > -1) {
                                vm.softwares.splice(vm.softwares.indexOf(software), 1);
                            }
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

            }]
    });

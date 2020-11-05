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

angular.module('app.exam.editor').component('newExam', {
    template: require('./newExam.template.html'),
    controller: [
        'Exam',
        '$http',
        function(Exam, $http) {
            const vm = this;

            vm.$onInit = function() {
                Exam.listExecutionTypes().then(function(types) {
                    vm.executionTypes = types;
                    vm.examinationType = 'AQUARIUM';
                    $http
                        .get('/app/settings/byod')
                        .then(resp => (vm.byodExaminationSupported = resp.data.isByodExaminationSupported))
                        .catch(angular.noop);
                });
            };

            vm.selectType = () => {
                if (!vm.byodExaminationSupported) {
                    Exam.createExam(vm.type.type, vm.examinationType);
                }
            };

            vm.createExam = function() {
                if (vm.type) {
                    Exam.createExam(vm.type.type, vm.examinationType);
                }
            };
        },
    ],
});

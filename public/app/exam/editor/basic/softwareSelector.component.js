'use strict';
angular.module('app.exam.editor')
    .component('softwareSelector', {
        templateUrl: '/assets/app/exam/editor/basic/softwareSelector.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$translate', 'SoftwareRes', 'ExamRes', 'toast',
            function ($translate, SoftwareRes, ExamRes, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.software = SoftwareRes.softwares.query();
                };

                vm.selectedSoftware = function () {
                    return vm.exam.softwares.length === 0 ? $translate.instant('sitnet_select') :
                        vm.exam.softwares.map(function (software) {
                            return software.name;
                        }).join(", ");
                };

                vm.isSelected = function (sw) {
                    return vm.exam.softwares.map(function (es) {
                            return es.id;
                        }).indexOf(sw.id) > -1;
                };

                vm.updateExamSoftware = function (sw) {
                    ExamRes.software.update({eid: vm.exam.id, sid: sw.id}, function (){
                        if (vm.isSelected(sw)) {
                            var index = vm.exam.softwares.map(function (es) {
                                return es.id;
                            }).indexOf(sw.id);
                            vm.exam.softwares.splice(index, 1);
                        } else {
                            vm.exam.softwares.push(sw);
                        }
                        toast.info($translate.instant('sitnet_exam_software_updated'));
                    }, function (error) {
                        toast.error(error.data);
                    });
                };

            }]
    });

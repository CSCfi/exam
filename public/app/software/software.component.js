angular.module('app.software')
    .component('software', {
        templateUrl: '/assets/app/software/software.template.html',
        controller: ['SoftwareRes', '$translate',
            function (SoftwareRes, $translate) {

                var vm = this;

                vm.$onInit = function () {
                    vm.softwares = SoftwareRes.softwares.query();
                };

                vm.updateSoftware = function (software) {
                    SoftwareRes.update.update({id: software.id}, software,
                        function (updated_software) {
                            software = updated_software;
                            toastr.info($translate.instant('sitnet_software_updated'));
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                vm.addSoftware = function (name) {
                    SoftwareRes.add.insert({name: name}, function (software) {
                            toastr.info($translate.instant('sitnet_software_added'));
                            vm.softwares.push(software);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                vm.removeSoftware = function (software) {
                    SoftwareRes.software.remove({id: software.id},
                        function () {
                            toastr.info($translate.instant('sitnet_software_removed'));
                            if (vm.softwares.indexOf(software) > -1) {
                                vm.softwares.splice(vm.softwares.indexOf(software), 1);
                            }
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

            }]
    });
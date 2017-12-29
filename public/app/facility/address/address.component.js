'use strict';
angular.module('app.facility.address')
    .component('examAddress', {
        templateUrl: '/assets/app/facility/address/address.template.html',
        bindings: {
            address: '<'
        },
        controller: ['Room', 'toast', '$translate', function (Room, toast, $translate) {

            var vm = this;

            vm.updateAddress = function () {
                Room.addresses.update(vm.address,
                    function () {
                        toast.info($translate.instant("sitnet_room_address_updated"));
                    },
                    function (error) {
                        toast.error(error.data);
                    }
                );
            };
        }]
    });
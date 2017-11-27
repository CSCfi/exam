'use strict';
angular.module('app.facility.accessibility')
    .component('accessibilitySelector', {
        templateUrl: '/assets/app/facility/accessibility/accessibilitySelector.template.html',
        bindings: {
            room: '<'
        },
        controller: ['$translate', 'toast', '$http', function ($translate, toast, $http) {
            var vm = this;

            vm.$onInit = function () {
                $http.get('/app/accessibility').success(function (data) {
                    vm.accessibilities = data;
                });
            };

            vm.selectedAccessibilities = function () {
                return vm.room.accessibility.length === 0 ? $translate.instant('sitnet_select') :
                    vm.room.accessibility.map(function (ac) {
                        return ac.name;
                    }).join(", ");
            };

            vm.isSelected = function (ac) {
                return getIndexOf(ac) > -1;
            };

            vm.updateAccessibility = function (ac) {
                var index = getIndexOf(ac);
                if (index > -1) {
                    vm.room.accessibility.splice(index, 1);
                } else {
                    vm.room.accessibility.push(ac);
                }
                var ids = vm.room.accessibility.map(function (item) {
                    return item.id;
                }).join(", ");

                $http.post('/app/room/' + vm.room.id + '/accessibility', {ids: ids})
                    .success(function () {
                        toast.info($translate.instant("sitnet_room_updated"));
                    });
            };

            function getIndexOf(ac) {
                return vm.room.accessibility.map(function (a) {
                    return a.id;
                }).indexOf(ac.id);
            }
        }]
    });
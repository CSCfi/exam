'use strict';

angular.module('app.examination')
    .component('examinationLogout', {
        template: '' +
        '<div id="sitnet-header" class="header">' +
        '    <div class="col-md-12 header-wrapper">' +
        '        <span class="header-text">{{\'sitnet_end_of_exam\' | translate}}</span>' +
        '    </div>' +
        '</div>' +
        '<div id="dashboard">' +
        '    <div class="exam-logout-wrapper">' +
        '        <h3 class="text-info" style="text-align: center">{{$ctrl.reasonPhrase | translate}} {{\'sitnet_log_out_will_commence\' | translate}}</h3>' +
        '    </div>' +
        '</div>',
        controller: ['$rootScope', '$routeParams', '$location', '$timeout',
            function ($rootScope, $routeParams, $location, $timeout) {

                var vm = this;

                vm.$onInit = function () {
                    vm.reasonPhrase = $routeParams.reason === 'aborted' ? 'sitnet_exam_aborted' : 'sitnet_exam_returned';

                    $timeout(function () {
                        $rootScope.$broadcast('examEnded');
                        $location.path('/logout');
                    }, 8000);
                };

            }
        ]
    });

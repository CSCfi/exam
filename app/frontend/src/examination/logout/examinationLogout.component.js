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

/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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
angular.module('app.review')
    .service('LanguageInspections', ['$resource', '$location', '$uibModal', '$translate', 'dialogs', 'EXAM_CONF', 'toast',
        function ($resource, $location, $modal, $translate, dialogs, EXAM_CONF, toast) {

            var self = this;

            var inspectionsApi = $resource('/app/inspections');
            var assignmentApi = $resource('/app/inspection/:id', {id: '@id'}, {'update': {method: 'PUT'}});

            self.query = function (params) {
                return inspectionsApi.query(params).$promise;
            };

            self.showStatement = function (statement) {
                var modalController = ['$scope', '$uibModalInstance', function ($scope, $modalInstance) {
                    $scope.statement = statement.comment;
                    $scope.ok = function () {
                        $modalInstance.close('Accepted');
                    };
                }];

                $modal.open({
                    templateUrl: EXAM_CONF.TEMPLATES_PATH + 'maturity/dialogs/inspection_statement.html',
                    backdrop: 'static',
                    keyboard: true,
                    controller: modalController,
                    resolve: {
                        statement: function () {
                            return statement.comment;
                        }
                    }
                });
            };

            self.assignInspection = function (inspection) {
                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                    $translate.instant('sitnet_confirm_assign_inspection'));
                dialog.result.then(function () {
                    assignmentApi.update({id: inspection.id}, function () {
                        $location.path('assessments/' + inspection.exam.id);
                    }, function (err) {
                        toast.error(err);
                    });
                });
            };


        }]);

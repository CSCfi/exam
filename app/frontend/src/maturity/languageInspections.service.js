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

angular.module('app.maturity')
    .service('LanguageInspections', ['$resource', '$location', '$uibModal', '$translate', 'dialogs',
        function ($resource, $location, $modal, $translate, dialogs) {

            const self = this;

            const inspectionsApi = $resource('/app/inspections');
            const assignmentApi = $resource('/app/inspection/:id', {id: '@id'}, {'update': {method: 'PUT'}});

            self.query = function (params) {
                return inspectionsApi.query(params).$promise;
            };

            self.showStatement = function (statement) {
                $modal.open({
                    backdrop: 'static',
                    keyboard: true,
                    component: 'inspectionStatementDialog',
                    resolve: {
                        statement: function () {
                            return statement.comment;
                        }
                    }
                }).result.catch(angular.noop);
            };

            self.assignInspection = function (inspection) {
                const dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
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

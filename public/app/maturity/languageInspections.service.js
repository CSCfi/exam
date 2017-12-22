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

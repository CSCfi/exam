/*
 * Copyright (c) 2018 Exam Consortium
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
 *
 */
import angular from 'angular';

require('../../../../src/administrative/statistics/index');
require('angular-resource');
require('angular-translate');
require('angular-mocks');

describe('StatisticsComponent', function() {
    let ctrl, $httpBackend;

    beforeEach(function() {
        angular.mock.module('app.administrative.statistics');
        angular.mock.module('ngResource');
    });

    beforeEach(
        angular.mock.module('pascalprecht.translate', function($translateProvider) {
            $translateProvider.translations('en', {}).preferredLanguage('en');
        }),
    );

    beforeEach(inject(function($rootScope, $componentController, $injector) {
        jasmine.getFixtures().fixturesPath = 'base/unit/fixtures';
        $httpBackend = $injector.get('$httpBackend');
        ctrl = $componentController('statistics', {
            $scope: $rootScope.$new(),
        });
        ctrl.$onInit();
        $httpBackend.expectGET('/app/reports/departments').respond({ departments: ['a', 'b', 'c'] });
        $httpBackend.flush();
    }));

    it('should have controller defined', function() {
        expect(ctrl).toBeDefined();
    });

    it('should have right departments', function() {
        expect(ctrl.departments).toEqual([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
    });
});

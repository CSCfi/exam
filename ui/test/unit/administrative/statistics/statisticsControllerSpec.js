// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

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
        expect(ctrl.departments).toEqual([
            { name: 'a', filtered: false },
            { name: 'b', filtered: false },
            { name: 'c', filtered: false },
        ]);
    });
});

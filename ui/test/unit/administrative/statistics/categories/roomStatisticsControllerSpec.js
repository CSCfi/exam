// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import angular from 'angular';

describe('RoomStatisticsComponent', function() {
    let ctrl, $httpBackend, componentController;

    beforeEach(function() {
        angular.mock.module('app.administrative.statistics', 'ngResource');
    });

    beforeEach(
        angular.mock.module('pascalprecht.translate', function($translateProvider) {
            $translateProvider.translations('en', {}).preferredLanguage('en');
        }),
    );

    beforeEach(inject(function($rootScope, $componentController, $injector) {
        jasmine.getFixtures().fixturesPath = 'base/unit/fixtures';
        $httpBackend = $injector.get('$httpBackend');
        componentController = $componentController;
    }));

    it('should have load participation statistics', function() {
        ctrl = componentController('roomStatistics', null, {
            queryParams: {
                end: 'Tue Mar 01 2016 12:00:00 GMT',
            },
        });
        $httpBackend
            .expectGET(/\/app\/reports\/participations\?end=[\w:+^&]/)
            .respond(readFixtures('participations.json'));
        ctrl.listParticipations();
        $httpBackend.flush();

        // Check participations
        expect(ctrl.participations).toBeDefined();
        expect(ctrl.participations instanceof Object).toBeTruthy();
        expect(Object.keys(ctrl.participations).length > 0).toBeTruthy();

        // Check months
        expect(ctrl.months.length).toEqual(4);
        const months = ctrl.months.map(function(month) {
            const date = new Date(month);
            // console.info(date + ', ' + date.getTime());
            return { year: date.getYear(), month: date.getMonth() };
        });
        expect(months[0]).toEqual({ year: 115, month: 11 });
        expect(months.pop()).toEqual({ year: 116, month: 2 });
    });
});

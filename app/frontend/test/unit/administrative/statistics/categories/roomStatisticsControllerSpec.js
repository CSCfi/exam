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
                endDate: 'Tue Mar 01 2016 12:00:00 GMT',
            },
        });
        $httpBackend
            .expectGET(/\/app\/reports\/participations\?endDate=[\w:+^&]/)
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
            console.info(date + ', ' + date.getTime());
            return { year: date.getYear(), month: date.getMonth() };
        });
        expect(months[0]).toEqual({ year: 115, month: 11 });
        expect(months.pop()).toEqual({ year: 116, month: 2 });
    });
});

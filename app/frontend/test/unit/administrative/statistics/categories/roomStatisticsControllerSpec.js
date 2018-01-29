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

describe('RoomStatisticsComponent', function () {

    let ctrl, $httpBackend, componentController;

    beforeEach(function () {
        angular.mock.module('app.administrative.statistics', 'ngResource');
    });

    beforeEach(angular.mock.module('pascalprecht.translate', function ($translateProvider) {
        $translateProvider
            .translations('en', {})
            .preferredLanguage('en');
    }));

    beforeEach(inject(function ($rootScope, $componentController, $injector) {
        jasmine.getFixtures().fixturesPath = 'base/unit/fixtures';
        $httpBackend = $injector.get('$httpBackend');
        componentController = $componentController;
    }));

    it('should have load participation statistics', function () {
        ctrl = componentController('roomStatistics', null, {
            queryParams: {
                start: 'Tue Dec 01 2015 00:00:00 GMT+0200',
                end:'Tue Mar 01 2016 00:00:00 GMT+0200'
            }
        });
        $httpBackend.expectGET('/app/reports/participations?end=Tue+Mar+01+2016+00:00:00+GMT%2B0200&start=Tue+Dec+01+2015+00:00:00+GMT%2B0200')
            .respond(readFixtures('participations.json'));
        ctrl.listParticipations();
        $httpBackend.flush();

        // Check participations
        expect(ctrl.participations).toBeDefined();
        expect(ctrl.participations instanceof Object).toBeTruthy();
        expect(Object.keys(ctrl.participations).length > 0).toBeTruthy();

        // Check months
        expect(ctrl.months.length).toEqual(26);
        let months = ctrl.months.map(function (month) {
            let date = new Date(month);
            console.info(date);
            return {year: date.getYear(), month: date.getMonth()};
        });
        expect(months[0]).toEqual({year: 115, month: 11});
        expect(months.pop()).toEqual({year: 118, month: 0});
    });

});


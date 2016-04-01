'use strict';
describe('StatisticsController', function () {

    var ctrl, scope, ReportResource, dateService, $httpBackend;

    beforeEach(function () {
        module('exam');
        module('exam.controllers');
        module('exam.resources');
        module('exam.services');
    });

    beforeEach(module('pascalprecht.translate', function ($translateProvider) {
        $translateProvider
            .translations('en', {})
            .preferredLanguage('en');
    }));

    beforeEach(inject(function ($controller, $rootScope, $injector) {
        jasmine.getFixtures().fixturesPath = 'base/test/unit/fixtures';
        scope = $rootScope.$new();
        ReportResource = $injector.get('ReportResource');
        dateService = $injector.get('dateService');
        $httpBackend = $injector.get('$httpBackend');
        ctrl = $controller('StatisticsController', {
            $scope: scope,
            EXAM_CONF: {},
            ReportResource: ReportResource,
            dateService: dateService,
            RoomResource: {}
        });
        $httpBackend.expectGET('/app/reports/departments')
            .respond({departments: ['a', 'b', 'c']});
        $httpBackend.flush();
    }));

    it('should have controller defined', function () {
        expect(ctrl).toBeDefined();
    });

    it('should have right departments', function () {
        expect(scope.departments).toEqual([{name: 'a'}, {name: 'b'}, {name: 'c'}]);
    });

    it('should have load participation statistics', function () {
        $httpBackend.expectGET('/app/reports/participations?end=1456783200000&start=1448920800000')
            .respond(readFixtures('participations.json'));
        scope.dateService.startDate = 'Tue Dec 01 2015 00:00:00 GMT+0200';
        scope.dateService.endDate = 'Tue Mar 01 2016 00:00:00 GMT+0200';
        scope.listParticipations();
        $httpBackend.flush();

        // Check participations
        expect(scope.participations).toBeDefined();
        expect(scope.participations instanceof Object).toBeTruthy();
        expect(Object.keys(scope.participations).length > 0).toBeTruthy();

        // Check min and max date
        console.info('Min date: ' + new Date(scope.minDate));
        expect(scope.minDate).toEqual(1449493200134);
        console.info('Max date: ' + new Date(scope.maxDate));
        expect(scope.maxDate).toEqual(1456783200000);

        // Check months
        expect(scope.months.length).toEqual(4);
        var months = [];
        scope.months.forEach(function (month) {
            var date = new Date(month);
            console.info(date);
            months.push({year: date.getYear(), month: date.getMonth()});
        });
        expect(months).toEqual([{year: 115, month: 11}, {year: 116, month: 0}, {year: 116, month: 1}, {year: 116, month: 2}]);
    });
});
'use strict';
describe('StatisticsComponent', function () {

    var ctrl, $httpBackend;

    beforeEach(function () {
        module('exam');
    });

    beforeEach(module('pascalprecht.translate', function ($translateProvider) {
        $translateProvider
            .translations('en', {})
            .preferredLanguage('en');
    }));

    beforeEach(inject(function ($rootScope, $componentController, $injector) {
        jasmine.getFixtures().fixturesPath = 'base/test/unit/fixtures';
        $httpBackend = $injector.get('$httpBackend');
        ctrl = $componentController('statistics', {
            $scope: $rootScope.$new(),
            EXAM_CONF: {},
            Reports: $injector.get('Reports'),
            dateService: $injector.get('dateService'),
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
        expect(ctrl.departments).toEqual([{name: 'a'}, {name: 'b'}, {name: 'c'}]);
    });

    it('should have load participation statistics', function () {
        $httpBackend.expectGET('/app/reports/participations?end=Tue+Mar+01+2016+00:00:00+GMT%2B0200&start=Tue+Dec+01+2015+00:00:00+GMT%2B0200')
            .respond(readFixtures('participations.json'));
        ctrl.dateService.startDate = 'Tue Dec 01 2015 00:00:00 GMT+0200';
        ctrl.dateService.endDate = 'Tue Mar 01 2016 00:00:00 GMT+0200';
        ctrl.listParticipations();
        $httpBackend.flush();

        // Check participations
        expect(ctrl.participations).toBeDefined();
        expect(ctrl.participations instanceof Object).toBeTruthy();
        expect(Object.keys(ctrl.participations).length > 0).toBeTruthy();

        // Check min and max date
        console.info('Min date: ' + new Date(ctrl.minDate));
        expect(ctrl.minDate).toEqual(1449493200134);
        console.info('Max date: ' + new Date(ctrl.maxDate));
        expect(ctrl.maxDate).toEqual(1456783200000);

        // Check months
        expect(ctrl.months.length).toEqual(4);
        var months = [];
        ctrl.months.forEach(function (month) {
            var date = new Date(month);
            console.info(date);
            months.push({year: date.getYear(), month: date.getMonth()});
        });
        expect(months).toEqual([{year: 115, month: 11}, {year: 116, month: 0}, {year: 116, month: 1}, {year: 116, month: 2}]);
    });

});

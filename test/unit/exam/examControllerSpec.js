'use strict';
describe('ExamController', function () {

    var ctrl, scope, $httpBackend, q, ExamRes;

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

    beforeEach(inject(function ($controller, $rootScope, $injector, $q) {
        scope = $rootScope.$new();
        $httpBackend = $injector.get('$httpBackend');
        q = $q;
        var languageRes = $injector.get('LanguageRes');
        var softwareResource = $injector.get('SoftwareResource');
        var settingsResource = $injector.get('SettingsResource');
        ExamRes = $injector.get('ExamRes');

        $httpBackend.expectGET('/app/settings/durations').respond(200, {});
        $httpBackend.expectGET('/app/settings/gradescale').respond(200, {});
        $httpBackend.expectGET('/app/languages').respond(200, []);
        $httpBackend.expectGET('/app/settings/hostname').respond(200, {});
        $httpBackend.expectGET('/app/softwares').respond(200, []);

        ctrl = $controller('ExamController', {
            $scope: scope,
            EXAM_CONF: {},
            dialogs: {},
            sessionService: mockSessionService(),
            examService: mockExamService(),
            ExamRes: ExamRes,
            QuestionRes: {},
            UserRes: {},
            LanguageRes: languageRes,
            RoomResource: {},
            SoftwareResource: softwareResource,
            SettingsResource: settingsResource,
            fileService: {},
            questionService: mockQuestionService(),
            EnrollRes: {}
        });
    }));

    it('should been defined', function () {
        expect(ctrl).toBeDefined();
    });

    it('should have toggle disabled', function () {
        var section = {};
        expect(scope.toggleDisabled(section)).toBeTruthy();
        section.sectionQuestions = ['q1'];
        expect(scope.toggleDisabled(section)).toBeTruthy();
        section.sectionQuestions = ['q1', 'q2'];
        expect(scope.toggleDisabled(section)).toBeFalsy();
    });

    it('should have toggle lottery update call to server', function () {
        var section = {id: 1};
        section.sectionQuestions = [{id: 1, question: {}}, {id: 2, question:{}}];
        scope.newExam = {id: 1};

        $httpBackend.expectPUT('/app/exams/1/section/1', section).respond(200, section);

        scope.toggleLottery(section);

        $httpBackend.flush();

        expect(section.lotteryOn === undefined).toBeTruthy();
    });

    it('should not toggle lottery update call to server', function () {
        var section = {id: 1};
        section.sectionQuestions = [];
        scope.newExam = {id: 1};

        scope.toggleLottery(section);

        $httpBackend.flush();

        expect(section.lotteryOn).toBeFalsy();
    });

    function createPromise(response) {
        var deferred = q.defer();
        deferred.resolve(response);
        return deferred.promise;
    }

    function mockSessionService() {
        var sessionService = jasmine.createSpyObj('sessionService', ['getUser']);
        sessionService.getUser.and.returnValue({isStudent: false});
        return sessionService;
    }

    function mockExamService() {
        var examService = jasmine.createSpyObj('examService', ['listExecutionTypes', 'refreshExamTypes', 'refreshGradeScales']);
        examService.listExecutionTypes.and.callFake(function () {
            return createPromise({});
        });
        examService.refreshExamTypes.and.callFake(function () {
            return createPromise({});
        });
        examService.refreshGradeScales.and.callFake(function () {
            return createPromise({});
        });
        return examService;
    }

    function mockQuestionService() {
        var questionService = jasmine.createSpyObj('questionService', ['setFilter']);
        return questionService;
    }
});
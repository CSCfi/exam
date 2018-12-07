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

// DISABLED TEMPORARILY, NEEDS BE REWRITTEN

'use strict';
describe('ExamController', function () {

    /*var ctrl, scope, $httpBackend, q, ExamRes, window;

    beforeEach(function () {
        module('app.exam');
        module('app.common');
        module('app.question');
        module('ngResource');
        module('ngRoute');
        module('ui.bootstrap');
    });

    beforeEach(module('pascalprecht.translate', function ($translateProvider) {
        $translateProvider
            .translations('en', {})
            .preferredLanguage('en');
    }));

    beforeEach(inject(function ($controller, $rootScope, $injector, $q, $window) {
        scope = $rootScope.$new();
        scope.initializeExam = function () {
          var d = $q.defer();
          d.reject();
          return d.promise;
        };
        window = $window;
        window['toastr'] = {error: jasmine.createSpy('error'), warning: jasmine.createSpy('warning')};
        $httpBackend = $injector.get('$httpBackend');
        q = $q;
        var languageRes = $injector.get('Language');
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
            Session: mockSessionService(),
            examService: mockExamService(),
            enrolmentService: mockEnrolmentService(),
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

        $httpBackend.expectPUT('/app/exams/1/section/1').respond(200, section);

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
        return q.when(response);
    }

    function mockSessionService() {
        var sessionService = jasmine.createSpyObj('Session', ['getUser']);
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

    function mockEnrolmentService() {
        var enrolmentService = jasmine.createSpyObj('enrolmentService', ['enrollStudent']);
        enrolmentService.enrollStudent.and.callFake(function () {
            return createPromise({});
        });
        return enrolmentService;
    }

    function mockQuestionService() {
        var questionService = jasmine.createSpyObj('questionService', ['setFilter']);
        return questionService;
    }*/

});

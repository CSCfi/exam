describe('AssessmentController', function () {
    beforeEach(module('app.review', 'app.exam', 'ngResource'));

    var ctrl;
    var scope;
    var mockHttp;
    var mockUser = {id: 1, isAdmin: true};
    var mockExam = {id: 1, state: 'REVIEW', examSections: []};

    beforeEach(inject(function ($rootScope, $componentController, $httpBackend) {
        scope = $rootScope.$new();
        mockHttp = $httpBackend;
        mockHttpCalls();
        ctrl = $componentController('assessment', {
                $scope: scope,
                $routeParams: {id: 1},
                Assessment: createMockAssessment(),
                Question: createMockQuestion(),
                Session: createMockSession(),
                Exam: {},
                toast: {}
            }
        );
        ctrl.$onInit();
        mockHttp.flush();
    }));

    it('should start review when score is set', function () {
        expect(ctrl.exam.state).toBe('REVIEW');
        ctrl.scoreSet();
        mockHttp.flush();
        expect(ctrl.exam.state).toBe('REVIEW_STARTED');
    });

    it('should start review when grading is updated', function () {
        expect(ctrl.exam.state).toBe('REVIEW');
        ctrl.gradingUpdated();
        mockHttp.flush();
        expect(ctrl.exam.state).toBe('REVIEW_STARTED');
    });

    it('should check if under language inspection when user is not inspector', function () {
        mockUser.isLanguageInspector = false;
        expect(ctrl.isUnderLanguageInspection()).toBeFalsy();
    });

    it('should check if under language inspection when no user', function () {
        ctrl.user = null;
        expect(ctrl.isUnderLanguageInspection()).toBeFalsy();
    });

    it('should check if under language inspection', function () {
        mockUser.isLanguageInspector = true;
        ctrl.exam.languageInspection = {};
        expect(ctrl.isUnderLanguageInspection()).toBeTruthy();
    });

    function mockHttpCalls() {
        mockHttp.whenRoute('GET', '/app/review/:eid')
            .respond(mockExam);
        mockHttp.whenRoute('PUT', '/app/review/:id')
            .respond({});
    }

    function createMockAssessment() {
        var mock = jasmine.createSpyObj('Assessment', ['getPayload']);
        mock.getPayload.and.callFake(function (exam, state) {
            return {id: 1, state: state};
        });
        return mock;
    }

    function createMockSession() {
        var mock = jasmine.createSpyObj('Session', ['getUser']);
        mock.getUser.and.returnValue(mockUser);
        return mock;
    }

    function createMockQuestion() {
        var mock = jasmine.createSpyObj('Question', ['getQuestionAmounts']);
        mock.getQuestionAmounts.and.returnValue({accepted: 0, rejected: 0, hasEssays: false});
        return mock;
    }

});
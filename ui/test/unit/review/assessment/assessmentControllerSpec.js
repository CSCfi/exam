// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import angular from 'angular';

describe('AssessmentController', function() {
    beforeEach(angular.mock.module('app.review', 'app.exam', 'ngResource'));

    let ctrl;
    let scope;
    let mockHttp;
    const mockUser = { id: 1, isAdmin: true };
    const mockExam = { id: 1, state: 'REVIEW', examParticipation: {}, examSections: [] };

    beforeEach(inject(function($rootScope, $componentController, $httpBackend) {
        scope = $rootScope.$new();
        mockHttp = $httpBackend;
        mockHttpCalls();
        ctrl = $componentController('assessment', {
            $scope: scope,
            $stateParams: { id: 1 },
            $state: {},
            Assessment: createMockAssessment(),
            CollaborativeAssessment: {},
            Question: createMockQuestion(),
            Session: createMockSession(),
            Exam: {},
        });
        ctrl.$onInit();
        mockHttp.flush();
    }));

    it('should start review when score is set', function() {
        expect(ctrl.exam.state).toBe('REVIEW');
        ctrl.scoreSet({ revision: undefined });
        mockHttp.flush();
        expect(ctrl.exam.state).toBe('REVIEW_STARTED');
    });

    it('should start review when grading is updated', function() {
        expect(ctrl.exam.state).toBe('REVIEW');
        ctrl.gradingUpdated();
        mockHttp.flush();
        expect(ctrl.exam.state).toBe('REVIEW_STARTED');
    });

    it('should check if under language inspection when user is not inspector', function() {
        mockUser.isLanguageInspector = false;
        expect(ctrl.isUnderLanguageInspection()).toBeFalsy();
    });

    it('should check if under language inspection when no user', function() {
        ctrl.user = null;
        expect(ctrl.isUnderLanguageInspection()).toBeFalsy();
    });

    it('should check if under language inspection', function() {
        mockUser.isLanguageInspector = true;
        ctrl.exam.languageInspection = {};
        expect(ctrl.isUnderLanguageInspection()).toBeTruthy();
    });

    function mockHttpCalls() {
        mockHttp.whenRoute('GET', '/app/review/:eid').respond(mockExam);
        mockHttp.whenRoute('PUT', '/app/review/:id').respond({});
    }

    function createMockAssessment() {
        const mock = jasmine.createSpyObj('Assessment', ['getPayload']);
        mock.getPayload.and.callFake(function(exam, state) {
            return { id: 1, state: state };
        });
        return mock;
    }

    function createMockSession() {
        const mock = jasmine.createSpyObj('Session', ['getUser']);
        mock.getUser.and.returnValue(mockUser);
        return mock;
    }

    function createMockQuestion() {
        const mock = jasmine.createSpyObj('Question', ['getQuestionAmounts']);
        mock.getQuestionAmounts.and.returnValue({ accepted: 0, rejected: 0, hasEssays: false });
        return mock;
    }
});

// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ExamService } from 'src/app/exam/exam.service';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import { SessionService } from 'src/app/session/session.service';
import { vi } from 'vitest';
import { AssessmentComponent } from './assessment.component';
import { AssessmentService } from './assessment.service';
import { CollaborativeAssesmentService } from './collaborative-assessment.service';

describe('AssessmentComponent (collaborative)', () => {
    let component: AssessmentComponent;
    let http: HttpTestingController;

    const participation = () => ({
        _id: 'abc',
        _rev: '1-a',
        exam: { id: 2343, state: 'REVIEW', examSections: [], examFeedback: { comment: '' } },
    });

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { data: { collaborative: true }, params: { id: 7, ref: 'abc' } } },
                },
                { provide: Router, useValue: { navigate: vi.fn() } },
                { provide: ToastrService, useValue: { info: vi.fn(), error: vi.fn() } },
                { provide: SessionService, useValue: { getUser: () => ({ id: 1 }) } },
                { provide: QuestionScoringService, useValue: { getQuestionAmounts: () => ({}) } },
                { provide: ExamService, useValue: { isOwnerOrAdmin: () => true } },
                { provide: AssessmentService, useValue: {} },
                {
                    provide: CollaborativeAssesmentService,
                    useValue: { getPayload: (_: unknown, state: string, rev: string) => ({ state, rev }) },
                },
            ],
        });
        http = TestBed.inject(HttpTestingController);
        component = TestBed.runInInjectionContext(() => new AssessmentComponent());
        http.expectOne('/app/iop/reviews/7/abc').flush(participation());
    });

    afterEach(() => TestBed.resetTestingModule());

    it('should keep participation.exam pointing at the edited exam after scoring', () => {
        component.scoreSet('2-b');
        // Grading writes straight into exam(), collaborative save reads participation().exam
        component.exam()!.customCredit = 2;
        expect(component.participation()!.exam).toBe(component.exam());
        expect(component.participation()!.exam.customCredit).toBe(2);
    });

    it('should not discard edits made while the review start request is in flight', () => {
        component.scoreSet('2-b');
        const req = http.expectOne('/app/iop/reviews/7/abc');
        expect(req.request.body).toEqual({ state: 'REVIEW_STARTED', rev: '2-b' });

        component.onExamUpdated();
        component.exam()!.customCredit = 2;
        req.flush({ rev: '3-c' });

        const exam = component.exam()!;
        expect(exam.state).toBe('REVIEW_STARTED');
        expect(exam.customCredit).toBe(2);
        expect(component.participation()!.exam).toBe(exam);
        expect(component.participation()!._rev).toBe('3-c');
    });
});

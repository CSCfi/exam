// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import type { Exam } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { errorInterceptor } from 'src/app/interceptors/error.interceptor';
import { SessionService } from 'src/app/session/session.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { ExamPublicationComponent } from './exam-publication.component';

describe('ExamPublicationComponent', () => {
    let component: ExamPublicationComponent;
    let fixture: ComponentFixture<ExamPublicationComponent>;
    let http: HttpTestingController;
    let exam: ReturnType<typeof signal<Exam>>;
    let collaborative: boolean;
    const toast = { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() };
    const router = { navigate: vi.fn() };
    const modalResult = new Subject<unknown>();
    const modalRef = {
        componentInstance: { errors: { set: vi.fn() }, exam: { set: vi.fn() }, prePublication: { set: vi.fn() } },
    };
    const modal = { openRef: vi.fn(() => modalRef), result$: vi.fn(() => modalResult), open$: vi.fn(() => of(true)) };
    const saveExam$ = vi.fn((...args: unknown[]) => of(args));

    const publishable = (overrides: Partial<Exam> = {}): Exam =>
        ({
            id: 7,
            name: 'Maths',
            state: 'DRAFT',
            examLanguages: [{ code: 'fi' }],
            executionType: { type: 'PUBLIC' },
            implementation: 'CLIENT_AUTH',
            periodStart: '2030-01-01T00:00:00Z',
            periodEnd: '2030-02-01T00:00:00Z',
            examinationDates: [],
            duration: 60,
            gradeScale: { id: 1 },
            examType: { type: 'FINAL' },
            examOwners: [{ id: 1 }],
            course: { id: 1 },
            examSections: [{ name: 'Basics', sectionQuestions: [{ id: 1 }] }],
            examEnrolments: [],
            examinationEventConfigurations: [{ id: 1 }],
            children: [],
            hasEnrolmentsInEffect: false,
            ...overrides,
        }) as unknown as Exam;

    const create = (e: Exam = publishable(), collab = false) => {
        exam = signal(e);
        collaborative = collab;
        fixture = TestBed.createComponent(ExamPublicationComponent);
        component = fixture.componentInstance;
        http.expectOne('/app/settings/durations').flush({ examDurations: [45, 90] });
    };
    const publish = () => {
        component.saveAndPublishExam();
        return modalRef.componentInstance.errors.set.mock.calls.at(-1)?.[0] as string[] | undefined;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [ExamPublicationComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(withInterceptors([errorInterceptor])),
                provideHttpClientTesting(),
                { provide: ToastService, useValue: toast },
                { provide: Router, useValue: router },
                { provide: ActivatedRoute, useValue: {} },
                { provide: ModalService, useValue: modal },
                { provide: SessionService, useValue: { getUser: () => ({ isAdmin: false }) } },
                {
                    provide: ExamService,
                    useValue: { hasQuestions: () => true, hasEssayQuestions: () => false, previewExam: vi.fn() },
                },
                {
                    provide: ExamTabService,
                    useValue: {
                        get examSignal() {
                            return exam;
                        },
                        setExam: (e: Exam) => exam.set(e),
                        saveExam$,
                        isCollaborative: () => collaborative,
                        notifyTabChange: vi.fn(),
                    },
                },
            ],
        });
        TestBed.overrideComponent(ExamPublicationComponent, { set: { imports: [], template: '' } });
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('should load the duration choices', () => {
        create();
        expect(component.examDurations()).toEqual([45, 90]);
        expect(component.format(90)).toBe('01:30');
    });

    describe('publishing', () => {
        it('should publish a complete exam after confirmation', () => {
            create();

            expect(publish()).toBeUndefined();
            modalResult.next(true);

            expect(saveExam$).toHaveBeenCalledWith({ state: 'PUBLISHED' }, true);
            expect(toast.success).toHaveBeenCalledWith('i18n_exam_saved_and_published');
            expect(router.navigate).toHaveBeenCalledWith(['/staff', 'teacher']);
        });

        it('should list what is missing', () => {
            create(
                publishable({
                    name: 'M',
                    examLanguages: [],
                    periodStart: null,
                    duration: 0,
                    course: undefined,
                    examSections: [{ name: '', sectionQuestions: [] }] as unknown as Exam['examSections'],
                    examinationEventConfigurations: [],
                }),
            );

            expect(publish()).toEqual([
                'i18n_exam_name_missing_or_too_short',
                'i18n_error_exam_empty_exam_language',
                'i18n_exam_start_date_missing',
                'i18n_exam_duration_missing',
                'i18n_course_missing',
                'i18n_exam_has_no_questions',
                'i18n_exam_contains_unnamed_sections',
                'i18n_missing_examination_event_configurations',
            ]);
            expect(saveExam$).not.toHaveBeenCalled();
        });

        it('should require examination dates instead of a period for a printout exam', () => {
            create(
                publishable({
                    executionType: { type: 'PRINTOUT' } as Exam['executionType'],
                    periodStart: null,
                    periodEnd: null,
                }),
            );
            expect(publish()).toEqual(['i18n_examination_date_missing']);
        });

        it('should require participants and the language inspection choice for a maturity', () => {
            create(publishable({ executionType: { type: 'MATURITY' } as Exam['executionType'] }));
            expect(publish()).toEqual(['i18n_no_participants', 'i18n_language_inspection_setting_not_chosen']);
        });

        it('should not need examination events for an Aquarium exam', () => {
            create(publishable({ implementation: 'AQUARIUM', examinationEventConfigurations: [] }));
            expect(publish()).toBeUndefined();
        });

        it('should refuse auto evaluation with repeated percentages or missing release', () => {
            create(
                publishable({
                    autoEvaluationConfig: {
                        releaseType: 'GIVEN_DATE',
                        gradeEvaluations: [{ percentage: 50 }, { percentage: 50 }],
                    },
                } as unknown as Partial<Exam>),
            );
            expect(publish()).toEqual([
                'i18n_autoevaluation_percentages_not_unique',
                'no auto-evaluation date selected',
            ]);
        });

        it('should pre-publish a draft collaborative exam with lighter checks', () => {
            create(publishable({ course: undefined, examSections: [], examinationEventConfigurations: [] }), true);

            expect(publish()).toBeUndefined();
            expect(modalRef.componentInstance.prePublication.set).toHaveBeenCalledWith(true);
            modalResult.next(true);

            expect(saveExam$).toHaveBeenCalledWith({ state: 'PRE_PUBLISHED' }, true);
            expect(router.navigate).toHaveBeenCalledWith(['/staff', 'collaborative']);
        });
    });

    describe('unpublishing', () => {
        it('should return the exam to draft', () => {
            create(publishable({ state: 'PUBLISHED' }));

            component.unpublishExam();

            expect(saveExam$).toHaveBeenCalledWith({ state: 'DRAFT' }, true);
            expect(toast.success).toHaveBeenCalledWith('i18n_exam_unpublished');
        });

        it('should not be possible once someone has taken the exam', () => {
            create(publishable({ state: 'PUBLISHED', children: [{ id: 2 }] as Exam['children'] }));

            component.unpublishExam();

            expect(saveExam$).not.toHaveBeenCalled();
            expect(toast.warning).toHaveBeenCalledWith('i18n_unpublish_not_possible');
        });
    });

    describe('examination dates', () => {
        it('should add a new date once', () => {
            create(publishable({ examinationDates: [{ id: 1, date: '2030-06-12' }] } as Partial<Exam>));

            component.addExaminationDate({ date: new Date(2030, 5, 12) });
            http.expectNone('/app/exam/7/examinationdate');

            component.addExaminationDate({ date: new Date(2030, 5, 13) });
            const req = http.expectOne('/app/exam/7/examinationdate');
            expect(req.request.body).toEqual({ date: '13/06/2030' });
            req.flush({ id: 2, date: '2030-06-13' });

            expect(component.exam().examinationDates.map((d) => d.id)).toEqual([1, 2]);
        });

        it('should remove a date and show why it failed', () => {
            const dates = [
                { id: 1, date: '2030-06-12' },
                { id: 2, date: '2030-06-13' },
            ];
            create(publishable({ examinationDates: dates } as Partial<Exam>));

            component.removeExaminationDate(dates[0]);
            http.expectOne('/app/exam/7/examinationdate/1').flush(null);
            expect(component.exam().examinationDates.map((d) => d.id)).toEqual([2]);

            component.removeExaminationDate(dates[1]);
            http.expectOne('/app/exam/7/examinationdate/2').flush('i18n_error_access_forbidden', {
                status: 403,
                statusText: 'Forbidden',
            });
            expect(toast.error).toHaveBeenCalledWith('i18n_error_access_forbidden');
            expect(component.exam().examinationDates).toHaveLength(1);
        });
    });

    it('should save duration and trial count right away', () => {
        create();

        component.setExamDuration(1, 15);
        component.setTrialCount(2);

        expect(component.exam()).toMatchObject({ duration: 75, trialCount: 2 });
        expect(saveExam$).toHaveBeenCalledTimes(2);
    });

    it('should allow auto evaluation only for scaled exams without essays', () => {
        create();
        expect(component.canBeAutoEvaluated()).toBe(true);
        create(publishable({ executionType: { type: 'MATURITY' } as Exam['executionType'] }));
        expect(component.canBeAutoEvaluated()).toBe(false);
    });
});

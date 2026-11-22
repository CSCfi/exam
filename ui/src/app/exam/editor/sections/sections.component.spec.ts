// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import type { Exam, ExamSection } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { errorInterceptor } from 'src/app/interceptors/error.interceptor';
import { SessionService } from 'src/app/session/session.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { SectionsComponent } from './sections.component';

describe('SectionsComponent', () => {
    let component: SectionsComponent;
    let fixture: ComponentFixture<SectionsComponent>;
    let http: HttpTestingController;
    let exam: ReturnType<typeof signal<Exam>>;
    const toast = { info: vi.fn(), success: vi.fn(), error: vi.fn() };
    const examService = {
        reorderSections$: vi.fn(() => of(undefined)),
        addSection$: vi.fn(() => of({ id: 4, name: '', sequenceNumber: 2 })),
        getResource: (url: string, collaborative: boolean) =>
            collaborative ? url.replace('/app/exams/', '/app/iop/exams/') : url,
        getMaxScore: () => 0,
    };

    const section = (id: number, sequenceNumber: number) => ({ id, sequenceNumber, name: `S${id}` }) as ExamSection;
    const ids = () => exam().examSections.map((s) => [s.id, s.sequenceNumber]);

    beforeEach(() => {
        vi.clearAllMocks();
        exam = signal({
            id: 7,
            executionType: { type: 'PUBLIC' },
            examSections: [section(2, 1), section(1, 0)],
        } as unknown as Exam);
        TestBed.configureTestingModule({
            imports: [SectionsComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(withInterceptors([errorInterceptor])),
                provideHttpClientTesting(),
                { provide: ToastService, useValue: toast },
                { provide: Router, useValue: { navigate: vi.fn() } },
                { provide: ActivatedRoute, useValue: {} },
                { provide: SessionService, useValue: { getUser: () => ({ isAdmin: false }) } },
                { provide: ExamService, useValue: examService },
                {
                    provide: ExamTabService,
                    useValue: {
                        get examSignal() {
                            return exam;
                        },
                        setExam: (e: Exam) => exam.set(e),
                        saveExam$: vi.fn(() => of({})),
                        isCollaborative: () => false,
                        notifyTabChange: vi.fn(),
                    },
                },
            ],
        });
        TestBed.overrideComponent(SectionsComponent, { set: { imports: [], template: '' } });
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(SectionsComponent);
        component = fixture.componentInstance;
        http.expectOne('/app/materials').flush([{ id: 1 }]);
    });

    afterEach(() => http.verify());

    it('should show the sections in order with the materials', () => {
        expect(ids()).toEqual([
            [1, 0],
            [2, 1],
        ]);
        expect(component.materials()).toEqual([{ id: 1 }]);
    });

    it('should reorder and renumber', () => {
        component.moveSection({ previousIndex: 0, currentIndex: 1 } as CdkDragDrop<ExamSection[]>);

        expect(examService.reorderSections$).toHaveBeenCalledWith(0, 1, expect.anything(), false);
        expect(ids()).toEqual([
            [2, 0],
            [1, 1],
        ]);
    });

    it('should keep the order when reordering fails', () => {
        examService.reorderSections$.mockReturnValue(throwError(() => 'i18n_error'));

        component.moveSection({ previousIndex: 0, currentIndex: 1 } as CdkDragDrop<ExamSection[]>);

        expect(toast.error).toHaveBeenCalledWith('i18n_error');
        expect(ids()[0][0]).toBe(1);
    });

    it('should add a section at the end', () => {
        component.addNewSection();
        expect(ids().map(([id]) => id)).toEqual([1, 2, 4]);
        expect(toast.success).toHaveBeenCalledWith('i18n_section_added');
    });

    it('should remove a section', () => {
        component.removeSection(section(1, 0));
        http.expectOne('/app/exams/7/sections/1').flush(null);
        expect(ids().map(([id]) => id)).toEqual([2]);
    });

    it('should keep a section the backend refuses to remove', () => {
        component.removeSection(section(1, 0));
        http.expectOne('/app/exams/7/sections/1').flush('i18n_error_access_forbidden', {
            status: 403,
            statusText: 'Forbidden',
        });
        expect(toast.error).toHaveBeenCalledWith('i18n_error_access_forbidden');
        expect(ids()).toHaveLength(2);
    });

    it('should replace an updated section in place', () => {
        component.updateSection({ ...section(2, 1), name: 'Renamed' });
        expect(exam().examSections.map((s) => s.name)).toEqual(['S1', 'Renamed']);
    });
});

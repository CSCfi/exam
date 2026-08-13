// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbCollapseModule, NgbDropdownModule, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { AutoEvaluationConfig, Exam, Grade, GradeScale } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { vi } from 'vitest';
import { AutoEvaluationComponent } from './auto-evaluation.component';

const mockGrades: Grade[] = [
    { id: 1, name: 'A', marksRejection: false },
    { id: 2, name: 'B', marksRejection: false },
    { id: 3, name: 'F', marksRejection: true },
];

const mockGradeScale: GradeScale = {
    id: 1,
    displayName: 'Default',
    description: 'Default scale',
    grades: mockGrades,
};

const mockAutoEvaluationConfig: AutoEvaluationConfig = {
    releaseType: 'IMMEDIATE',
    releaseDate: null,
    amountDays: 0,
    gradeEvaluations: [
        { grade: mockGrades[0], percentage: 90 },
        { grade: mockGrades[1], percentage: 70 },
        { grade: mockGrades[2], percentage: 0 },
    ],
};

function makeExam(overrides: Partial<Exam> = {}): Exam {
    return {
        id: 1,
        gradeScale: mockGradeScale,
        examSections: [],
        autoEvaluationConfig: undefined,
        ...overrides,
    } as Exam;
}

describe('AutoEvaluationComponent', () => {
    let component: AutoEvaluationComponent;
    let fixture: ComponentFixture<AutoEvaluationComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                AutoEvaluationComponent,
                ReactiveFormsModule,
                TranslateModule.forRoot(),
                NgbDropdownModule,
                NgbCollapseModule,
                NgbPopover,
            ],
            providers: [
                provideZonelessChangeDetection(),
                { provide: ExamService, useValue: { getMaxScore: vi.fn().mockReturnValue(100) } },
                { provide: CommonExamService, useValue: { getExamGradeDisplayName: vi.fn((n: string) => n) } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AutoEvaluationComponent);
        component = fixture.componentInstance;
    });

    it('should create', async () => {
        fixture.componentRef.setInput('exam', makeExam());
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component).toBeTruthy();
    });

    describe('form initialization from exam.autoEvaluationConfig', () => {
        it('should populate gradeEvaluations array from config on init', async () => {
            fixture.componentRef.setInput('exam', makeExam({ autoEvaluationConfig: mockAutoEvaluationConfig }));
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.gradeArray.length).toBe(3);
        });

        it('should set releaseType form value from config', async () => {
            const config: AutoEvaluationConfig = { ...mockAutoEvaluationConfig, releaseType: 'GIVEN_DATE' };
            fixture.componentRef.setInput('exam', makeExam({ autoEvaluationConfig: config }));
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.form.get('releaseType')?.value).toBe('GIVEN_DATE');
        });

        it('should default releaseType to IMMEDIATE when config has none', async () => {
            const config: AutoEvaluationConfig = { ...mockAutoEvaluationConfig, releaseType: undefined };
            fixture.componentRef.setInput('exam', makeExam({ autoEvaluationConfig: config }));
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.form.get('releaseType')?.value).toBe('IMMEDIATE');
        });

        it('should set amountDays from config', async () => {
            const config: AutoEvaluationConfig = { ...mockAutoEvaluationConfig, amountDays: 14 };
            fixture.componentRef.setInput('exam', makeExam({ autoEvaluationConfig: config }));
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.form.get('amountDays')?.value).toBe(14);
        });

        it('should use default config when exam has no autoEvaluationConfig', async () => {
            fixture.componentRef.setInput('exam', makeExam({ autoEvaluationConfig: undefined }));
            fixture.detectChanges();
            await fixture.whenStable();

            // Grade array should be populated from default (one row per grade)
            expect(component.gradeArray.length).toBe(mockGrades.length);
        });
    });

    describe('form enabled/disabled state', () => {
        it('should enable form when exam has autoEvaluationConfig', async () => {
            fixture.componentRef.setInput('exam', makeExam({ autoEvaluationConfig: mockAutoEvaluationConfig }));
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.form.enabled).toBe(true);
        });

        it('should disable form when exam has no autoEvaluationConfig', async () => {
            fixture.componentRef.setInput('exam', makeExam({ autoEvaluationConfig: undefined }));
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.form.disabled).toBe(true);
        });
    });

    describe('form re-initialization guard', () => {
        it('should NOT overwrite form values when exam input changes after initialization', async () => {
            fixture.componentRef.setInput('exam', makeExam({ autoEvaluationConfig: mockAutoEvaluationConfig }));
            fixture.detectChanges();
            await fixture.whenStable();

            // User edits a form field
            component.form.get('amountDays')?.setValue(42, { emitEvent: false });
            expect(component.form.get('amountDays')?.value).toBe(42);

            // Exam input changes (e.g. after a save — same shape, new reference)
            fixture.componentRef.setInput('exam', makeExam({ autoEvaluationConfig: mockAutoEvaluationConfig }));
            fixture.detectChanges();
            await fixture.whenStable();

            // User's edit must not be overwritten
            expect(component.form.get('amountDays')?.value).toBe(42);
        });

        it('should sync enabled state when exam config is removed after initialization', async () => {
            fixture.componentRef.setInput('exam', makeExam({ autoEvaluationConfig: mockAutoEvaluationConfig }));
            fixture.detectChanges();
            await fixture.whenStable();
            expect(component.form.enabled).toBe(true);

            // Parent removes the config (user disables auto-evaluation)
            fixture.componentRef.setInput('exam', makeExam({ autoEvaluationConfig: undefined }));
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.form.disabled).toBe(true);
        });

        it('should sync enabled state when exam config is added after initialization', async () => {
            fixture.componentRef.setInput('exam', makeExam({ autoEvaluationConfig: undefined }));
            fixture.detectChanges();
            await fixture.whenStable();
            expect(component.form.disabled).toBe(true);

            // Parent adds the config
            fixture.componentRef.setInput('exam', makeExam({ autoEvaluationConfig: mockAutoEvaluationConfig }));
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.form.enabled).toBe(true);
        });
    });

    describe('selectedReleaseType computed signal', () => {
        it('should reflect initial releaseType from config', async () => {
            const config: AutoEvaluationConfig = { ...mockAutoEvaluationConfig, releaseType: 'GIVEN_AMOUNT_DAYS' };
            fixture.componentRef.setInput('exam', makeExam({ autoEvaluationConfig: config }));
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.selectedReleaseType().name).toBe('GIVEN_AMOUNT_DAYS');
        });

        it('should update selectedReleaseType when selectReleaseType is called', async () => {
            fixture.componentRef.setInput('exam', makeExam({ autoEvaluationConfig: mockAutoEvaluationConfig }));
            fixture.detectChanges();
            await fixture.whenStable();

            component.selectReleaseType({ name: 'NEVER', translation: 'i18n_release_type_never' });
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.selectedReleaseType().name).toBe('NEVER');
        });
    });

    describe('outputs', () => {
        it('should emit enabled and updated when toggleEnabled is called with no config', async () => {
            fixture.componentRef.setInput('exam', makeExam({ autoEvaluationConfig: undefined }));
            fixture.detectChanges();
            await fixture.whenStable();
            vi.spyOn(component.enabled, 'emit');
            vi.spyOn(component.updated, 'emit');

            component.toggleEnabled();

            expect(component.enabled.emit).toHaveBeenCalled();
            expect(component.updated.emit).toHaveBeenCalled();
        });

        it('should emit disabled when toggleEnabled is called with existing config', async () => {
            fixture.componentRef.setInput('exam', makeExam({ autoEvaluationConfig: mockAutoEvaluationConfig }));
            fixture.detectChanges();
            await fixture.whenStable();
            vi.spyOn(component.disabled, 'emit');

            component.toggleEnabled();

            expect(component.disabled.emit).toHaveBeenCalled();
        });
    });
});

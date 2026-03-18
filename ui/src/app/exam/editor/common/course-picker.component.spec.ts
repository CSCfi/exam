// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Course } from 'src/app/exam/exam.model';
import { CourseCodeService } from 'src/app/shared/miscellaneous/course-code.service';
import { vi } from 'vitest';
import { CoursePickerComponent } from './course-picker.component';
import { CoursePickerService } from './course-picker.service';

const mockCourse: Course = {
    id: 1,
    name: 'Test Course',
    code: 'TC-001',
    credits: 5,
} as Course;

const mockCourse2: Course = {
    id: 2,
    name: 'Another Course',
    code: 'AC-002',
    credits: 3,
} as Course;

describe('CoursePickerComponent', () => {
    let component: CoursePickerComponent;
    let fixture: ComponentFixture<CoursePickerComponent>;
    let mockCourseCodeService: { formatCode: ReturnType<typeof vi.fn> };

    beforeEach(async () => {
        mockCourseCodeService = { formatCode: vi.fn((code: string) => code) };

        await TestBed.configureTestingModule({
            imports: [CoursePickerComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                { provide: CoursePickerService, useValue: { getCourses$: vi.fn() } },
                { provide: CourseCodeService, useValue: mockCourseCodeService },
                { provide: ToastrService, useValue: { error: vi.fn() } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CoursePickerComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    describe('course input → courseFilterModel sync', () => {
        it('should start with empty model when no course is provided', async () => {
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.courseFilterModel()).toEqual({ name: '', code: '' });
        });

        it('should populate model from course input on initialization', async () => {
            fixture.componentRef.setInput('course', mockCourse);
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.courseFilterModel().name).toBe('Test Course');
            expect(component.courseFilterModel().code).toBe('TC-001');
        });

        it('should call CourseCodeService.formatCode with the course code', async () => {
            fixture.componentRef.setInput('course', mockCourse);
            fixture.detectChanges();
            await fixture.whenStable();

            expect(mockCourseCodeService.formatCode).toHaveBeenCalledWith('TC-001');
        });

        it('should reset model to empty when course input becomes undefined', async () => {
            fixture.componentRef.setInput('course', mockCourse);
            fixture.detectChanges();
            await fixture.whenStable();
            expect(component.courseFilterModel().name).toBe('Test Course');

            fixture.componentRef.setInput('course', undefined);
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.courseFilterModel()).toEqual({ name: '', code: '' });
        });

        it('should update model when course input changes to a different course', async () => {
            fixture.componentRef.setInput('course', mockCourse);
            fixture.detectChanges();
            await fixture.whenStable();
            expect(component.courseFilterModel().name).toBe('Test Course');

            fixture.componentRef.setInput('course', mockCourse2);
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.courseFilterModel().name).toBe('Another Course');
            expect(component.courseFilterModel().code).toBe('AC-002');
        });
    });

    describe('onCourseSelect', () => {
        it('should emit updated with selected course', () => {
            fixture.detectChanges();
            vi.spyOn(component.updated, 'emit');

            component.onCourseSelect({ item: mockCourse, preventDefault: vi.fn() } as never);

            expect(component.updated.emit).toHaveBeenCalledWith(mockCourse);
        });

        it('should update form fields with formatted code and name on select', () => {
            fixture.detectChanges();

            component.onCourseSelect({ item: mockCourse, preventDefault: vi.fn() } as never);

            expect(mockCourseCodeService.formatCode).toHaveBeenCalledWith('TC-001');
        });
    });
});

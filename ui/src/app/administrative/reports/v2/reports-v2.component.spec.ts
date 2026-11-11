// SPDX-FileCopyrightText: 2026 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { CoursePickerService } from 'src/app/exam/editor/common/course-picker.service';
import { ExamExecutionType, Implementation } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { ReservationService } from 'src/app/reservation/reservation.service';
import { FileService } from 'src/app/shared/file/file.service';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { vi } from 'vitest';
import { ReportsV2Component } from './reports-v2.component';

describe('ReportsV2Component', () => {
    let component: ReportsV2Component;
    let fixture: ComponentFixture<ReportsV2Component>;
    let listReservationsMock: ReturnType<typeof vi.fn>;

    const mockReservations = [
        {
            id: 1,
            user: {
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice@example.com',
                eppn: 'alice@uni.fi',
                userIdentifier: '123',
            },
            enrolment: {
                exam: {
                    id: 101,
                    name: 'Public Exam 1',
                    course: { id: 1, code: 'CS101', name: 'Intro CS' },
                    executionType: { type: 'PUBLIC' } as ExamExecutionType,
                    implementation: 'AQUARIUM' as Implementation,
                    assessmentInfo: 'Locked review feedback details',
                },
            },
        },
        {
            id: 2,
            user: {
                firstName: 'Bob',
                lastName: 'Jones',
                email: 'bob@example.com',
                eppn: 'bob@uni.fi',
                userIdentifier: '456',
            },
            enrolment: {
                exam: {
                    id: 102,
                    name: 'Private Exam 1',
                    course: { id: 2, code: 'MATH101', name: 'Calculus' },
                    executionType: { type: 'PRIVATE' } as ExamExecutionType,
                    implementation: 'CLIENT_AUTH' as Implementation,
                },
            },
        },
        {
            id: 3,
            user: {
                firstName: 'Charlie',
                lastName: 'Brown',
                email: 'charlie@example.com',
                eppn: 'charlie@uni.fi',
                userIdentifier: '789',
            },
            enrolment: {
                exam: {
                    id: 103,
                    name: 'Maturity Exam 1',
                    course: { id: 3, code: 'FIN101', name: 'Finnish' },
                    executionType: { type: 'MATURITY' } as ExamExecutionType,
                    implementation: 'WHATEVER' as Implementation,
                },
            },
        },
    ];

    beforeEach(async () => {
        vi.useFakeTimers();
        listReservationsMock = vi.fn().mockReturnValue(of(mockReservations));

        await TestBed.configureTestingModule({
            imports: [ReportsV2Component, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                {
                    provide: ReservationService,
                    useValue: {
                        listReservations$: listReservationsMock,
                        printExamState: vi.fn().mockReturnValue('Published'),
                        searchStudents$: vi.fn().mockReturnValue(of([])),
                        searchExams$: vi.fn().mockReturnValue(of([])),
                        searchOwners$: vi.fn().mockReturnValue(of([])),
                    },
                },
                {
                    provide: ExamService,
                    useValue: {
                        getExecutionTypeTranslation: (et: ExamExecutionType) => {
                            switch (et.type) {
                                case 'PUBLIC':
                                    return 'i18n_public_exam';
                                case 'PRIVATE':
                                    return 'i18n_private_exam';
                                case 'MATURITY':
                                    return 'i18n_maturity';
                                case 'PRINTOUT':
                                    return 'i18n_printout_exam';
                                default:
                                    return '';
                            }
                        },
                    },
                },
                {
                    provide: CommonExamService,
                    useValue: {
                        getScaleDisplayName: vi.fn().mockReturnValue('0-5'),
                        getExamGradeDisplayName: vi.fn().mockReturnValue('5'),
                        getExamImplementationTranslation: (impl: Implementation) => {
                            switch (impl) {
                                case 'AQUARIUM':
                                    return 'i18n_examination_type_aquarium';
                                case 'CLIENT_AUTH':
                                    return 'i18n_examination_type_seb';
                                case 'WHATEVER':
                                    return 'i18n_examination_type_home_exam';
                                default:
                                    return '';
                            }
                        },
                    },
                },
                {
                    provide: CoursePickerService,
                    useValue: {
                        getCourses$: vi.fn().mockReturnValue(of([])),
                    },
                },
                {
                    provide: FileService,
                    useValue: {
                        download: vi.fn(),
                    },
                },
            ],
        }).compileComponents();

        TestBed.inject(TranslateService).use('fi');
        fixture = TestBed.createComponent(ReportsV2Component);
        component = fixture.componentInstance;
        TestBed.flushEffects();
        fixture.detectChanges();
    });

    afterEach(() => {
        vi.useRealTimers();
        TestBed.resetTestingModule();
    });

    it('should initialize examTypeOptions with execution types', () => {
        const options = component.examTypeOptions();
        expect(options).toEqual([
            { id: 'PUBLIC', value: 'PUBLIC', label: 'i18n_public_exam' },
            { id: 'PRIVATE', value: 'PRIVATE', label: 'i18n_private_exam' },
            { id: 'MATURITY', value: 'MATURITY', label: 'i18n_maturity' },
            { id: 'PRINTOUT', value: 'PRINTOUT', label: 'i18n_printout_exam' },
        ]);
    });

    it('should filter reservations by selected exam execution type', () => {
        component.examTypeChanged({ id: 'PUBLIC', value: 'PUBLIC', label: 'i18n_public_exam' });
        TestBed.flushEffects();
        vi.advanceTimersByTime(350);

        const data = component.reportData();
        expect(data.length).toBe(1);
        expect(data[0].firstName).toBe('Alice');
        expect(data[0].examType).toBe('i18n_public_exam');
    });

    it('should filter reservations by PRIVATE exam execution type', () => {
        component.examTypeChanged({ id: 'PRIVATE', value: 'PRIVATE', label: 'i18n_private_exam' });
        TestBed.flushEffects();
        vi.advanceTimersByTime(350);

        const data = component.reportData();
        expect(data.length).toBe(1);
        expect(data[0].firstName).toBe('Bob');
        expect(data[0].examType).toBe('i18n_private_exam');
    });

    it('should clear exam type filter when undefined is selected', () => {
        component.examTypeChanged({ id: 'PUBLIC', value: 'PUBLIC', label: 'i18n_public_exam' });
        TestBed.flushEffects();
        vi.advanceTimersByTime(350);
        expect(component.reportData().length).toBe(1);

        component.examTypeChanged(undefined);
        TestBed.flushEffects();
        vi.advanceTimersByTime(350);
        expect(component.reportData().length).toBe(0); // Because no filters are active now
    });

    it('should include all matching types when another filter is active and exam type is cleared', () => {
        component.email.set('example.com');
        TestBed.flushEffects();
        vi.advanceTimersByTime(350);
        expect(component.reportData().length).toBe(3);

        component.examTypeChanged({ id: 'MATURITY', value: 'MATURITY', label: 'i18n_maturity' });
        TestBed.flushEffects();
        vi.advanceTimersByTime(350);
        expect(component.reportData().length).toBe(1);
        expect(component.reportData()[0].firstName).toBe('Charlie');

        component.examTypeChanged(undefined);
        TestBed.flushEffects();
        vi.advanceTimersByTime(350);
        expect(component.reportData().length).toBe(3);
    });

    it('should initialize examMethodOptions with implementation types', () => {
        const options = component.examMethodOptions();
        expect(options).toEqual([
            { id: 'AQUARIUM', value: 'AQUARIUM', label: 'i18n_examination_type_aquarium' },
            { id: 'CLIENT_AUTH', value: 'CLIENT_AUTH', label: 'i18n_examination_type_seb' },
            { id: 'WHATEVER', value: 'WHATEVER', label: 'i18n_examination_type_home_exam' },
        ]);
    });

    it('should filter reservations by selected exam method (implementation)', () => {
        component.examMethodChanged({
            id: 'AQUARIUM',
            value: 'AQUARIUM',
            label: 'i18n_examination_type_aquarium',
        });
        TestBed.flushEffects();
        vi.advanceTimersByTime(350);

        const data = component.reportData();
        expect(data.length).toBe(1);
        expect(data[0].firstName).toBe('Alice');
        expect(data[0].examMethod).toBe('i18n_examination_type_aquarium');
    });

    it('should filter reservations by CLIENT_AUTH exam method', () => {
        component.examMethodChanged({
            id: 'CLIENT_AUTH',
            value: 'CLIENT_AUTH',
            label: 'i18n_examination_type_seb',
        });
        TestBed.flushEffects();
        vi.advanceTimersByTime(350);

        const data = component.reportData();
        expect(data.length).toBe(1);
        expect(data[0].firstName).toBe('Bob');
        expect(data[0].examMethod).toBe('i18n_examination_type_seb');
    });

    it('should clear exam method filter when undefined is selected', () => {
        component.examMethodChanged({
            id: 'AQUARIUM',
            value: 'AQUARIUM',
            label: 'i18n_examination_type_aquarium',
        });
        TestBed.flushEffects();
        vi.advanceTimersByTime(350);
        expect(component.reportData().length).toBe(1);

        component.examMethodChanged(undefined);
        TestBed.flushEffects();
        vi.advanceTimersByTime(350);
        expect(component.reportData().length).toBe(0); // Because no filters are active now
    });

    it('should combine exam type and exam method filters', () => {
        component.examTypeChanged({ id: 'PUBLIC', value: 'PUBLIC', label: 'i18n_public_exam' });
        component.examMethodChanged({
            id: 'CLIENT_AUTH',
            value: 'CLIENT_AUTH',
            label: 'i18n_examination_type_seb',
        });
        TestBed.flushEffects();
        vi.advanceTimersByTime(350);
        expect(component.reportData().length).toBe(0); // No exam is both PUBLIC and CLIENT_AUTH in mock data

        component.examMethodChanged({
            id: 'AQUARIUM',
            value: 'AQUARIUM',
            label: 'i18n_examination_type_aquarium',
        });
        TestBed.flushEffects();
        vi.advanceTimersByTime(350);
        expect(component.reportData().length).toBe(1);
        expect(component.reportData()[0].firstName).toBe('Alice');
    });

    it('should configure additionalInfo column with i18n_locked_assessment_additional_info label', () => {
        const columns = component.columnOptions();
        const additionalInfoCol = columns.find((c) => c.id === 'additionalInfo');
        expect(additionalInfoCol).toBeDefined();
        expect(additionalInfoCol?.label).toBe('i18n_locked_assessment_additional_info');
    });

    it('should map additionalInfo from exam assessmentInfo', () => {
        component.email.set('alice@example.com');
        TestBed.flushEffects();
        vi.advanceTimersByTime(350);

        const data = component.reportData();
        expect(data.length).toBe(1);
        expect(data[0].additionalInfo).toBe('Locked review feedback details');
    });

    it('should render sortable icon when column is unsorted and caret icons when sorted', () => {
        component.email.set('example.com');
        TestBed.flushEffects();
        vi.advanceTimersByTime(350);
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        const thElements = Array.from(compiled.querySelectorAll('th.sortable'));
        expect(thElements.length).toBeGreaterThan(0);

        // When unsorted, firstName column should display bi-arrow-down-up
        const firstNameTh = thElements.find((th) => th.textContent?.includes('i18n_firstname'));
        expect(firstNameTh).toBeDefined();
        expect(firstNameTh?.querySelector('i.bi-arrow-down-up')).toBeTruthy();

        // Sort ascending by firstName
        component.sort('firstName');
        fixture.detectChanges();
        expect(component.sortColumn()).toBe('firstName');
        expect(component.sortDirection()).toBe('asc');
        expect(firstNameTh?.querySelector('i.bi-caret-up-fill')).toBeTruthy();
        expect(firstNameTh?.querySelector('i.bi-arrow-down-up')).toBeFalsy();

        // Sort descending by firstName
        component.sort('firstName');
        fixture.detectChanges();
        expect(component.sortDirection()).toBe('desc');
        expect(firstNameTh?.querySelector('i.bi-caret-down-fill')).toBeTruthy();
        expect(firstNameTh?.querySelector('i.bi-arrow-down-up')).toBeFalsy();
    });
});

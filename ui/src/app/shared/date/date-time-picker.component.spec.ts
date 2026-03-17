// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { vi } from 'vitest';
import { DateTimePickerComponent } from './date-time-picker.component';

describe('DateTimePickerComponent — effect: initialTime → date/time sync', () => {
    let component: DateTimePickerComponent;
    let fixture: ComponentFixture<DateTimePickerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DateTimePickerComponent, FormsModule, TranslateModule.forRoot()],
            providers: [provideZonelessChangeDetection()],
        }).compileComponents();

        fixture = TestBed.createComponent(DateTimePickerComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    describe('initialTime → internal date/time sync', () => {
        it('should not crash when initialTime is null', () => {
            fixture.componentRef.setInput('initialTime', null);
            expect(() => fixture.detectChanges()).not.toThrow();
        });

        it('should keep current time when initialTime is null', async () => {
            fixture.componentRef.setInput('initialTime', null);
            fixture.detectChanges();
            await fixture.whenStable();

            // No initialTime — the effect guard skips setDateTime, signals keep defaults
            expect(component.date()).toBeInstanceOf(Date);
            expect(component.time().hour).toBeGreaterThanOrEqual(0);
        });

        it('should sync date from initialTime input on first render', async () => {
            const testDate = new Date(2025, 5, 15, 14, 30, 0); // 2025-06-15 14:30
            fixture.componentRef.setInput('initialTime', testDate);
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.date().getFullYear()).toBe(2025);
            expect(component.date().getMonth()).toBe(5);
            expect(component.date().getDate()).toBe(15);
        });

        it('should sync time fields from initialTime input', async () => {
            const testDate = new Date(2025, 5, 15, 14, 30, 0);
            fixture.componentRef.setInput('initialTime', testDate);
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.time().hour).toBe(14);
            expect(component.time().minute).toBe(30);
        });

        it('should update date/time when initialTime input changes', async () => {
            const first = new Date(2025, 0, 10, 9, 0, 0);
            const second = new Date(2025, 11, 25, 18, 45, 0);

            fixture.componentRef.setInput('initialTime', first);
            fixture.detectChanges();
            await fixture.whenStable();
            expect(component.time().hour).toBe(9);

            fixture.componentRef.setInput('initialTime', second);
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.time().hour).toBe(18);
            expect(component.time().minute).toBe(45);
            expect(component.date().getMonth()).toBe(11); // December
            expect(component.date().getDate()).toBe(25);
        });

        it('should handle midnight (00:00) correctly', async () => {
            const midnight = new Date(2025, 3, 1, 0, 0, 0);
            fixture.componentRef.setInput('initialTime', midnight);
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.time().hour).toBe(0);
            expect(component.time().minute).toBe(0);
        });

        it('should handle end of day (23:59) correctly', async () => {
            const endOfDay = new Date(2025, 3, 1, 23, 59, 0);
            fixture.componentRef.setInput('initialTime', endOfDay);
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.time().hour).toBe(23);
            expect(component.time().minute).toBe(59);
        });
    });

    describe('setTime', () => {
        it('should emit updated event with combined date and time', () => {
            const testDate = new Date(2025, 5, 15, 9, 0, 0);
            fixture.componentRef.setInput('initialTime', testDate);
            fixture.detectChanges();
            vi.spyOn(component.updated, 'emit');

            component.setTime({ hour: 10, minute: 20, second: 0 });

            expect(component.updated.emit).toHaveBeenCalledWith(expect.objectContaining({ date: expect.any(Date) }));
            const emitted = (component.updated.emit as ReturnType<typeof vi.spyOn>).mock.calls[0][0] as {
                date: Date;
            };
            expect(emitted.date.getHours()).toBe(10);
            expect(emitted.date.getMinutes()).toBe(20);
        });

        it('should update internal time signal', () => {
            fixture.detectChanges();

            component.setTime({ hour: 7, minute: 15, second: 0 });

            expect(component.time().hour).toBe(7);
            expect(component.time().minute).toBe(15);
        });
    });
});

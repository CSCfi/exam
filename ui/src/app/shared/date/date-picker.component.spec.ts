// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbDate } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Mock, vi } from 'vitest';
import { DatePickerComponent } from './date-picker.component';

describe('DatePickerComponent', () => {
    let component: DatePickerComponent;
    let fixture: ComponentFixture<DatePickerComponent>;
    let emitted: Mock<(value: { date: Date | null }) => void>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DatePickerComponent, TranslateModule.forRoot()],
            providers: [provideZonelessChangeDetection()],
        }).compileComponents();

        fixture = TestBed.createComponent(DatePickerComponent);
        component = fixture.componentInstance;
        emitted = vi.fn<(value: { date: Date | null }) => void>();
        component.updated.subscribe(emitted);
        fixture.detectChanges();
    });

    // Typing into the input sets the form value directly, then blur calls dateChange()
    const type = (date: NgbDate) => {
        component.dateForm.date().value.set(date);
        component.dateChange();
    };

    it('should emit a typed date within the range', () => {
        const year = new Date().getFullYear();
        type(new NgbDate(year + 1, 2, 9));
        expect(emitted).toHaveBeenCalledWith({ date: new Date(year + 1, 1, 9) });
    });

    it('should not emit a typed date with a five-digit year', () => {
        type(new NgbDate(10000, 2, 9));
        expect(emitted).not.toHaveBeenCalled();
    });

    it('should not emit a typed date before the minimum date', () => {
        fixture.componentRef.setInput('minDate', '2026-01-01');
        fixture.detectChanges();
        type(new NgbDate(2025, 12, 31));
        expect(emitted).not.toHaveBeenCalled();
    });

    it('should emit a date set from the calendar', () => {
        const year = new Date().getFullYear();
        component.setDate(new NgbDate(year, 6, 15));
        expect(emitted).toHaveBeenCalledWith({ date: new Date(year, 5, 15) });
    });

    it('should emit null when the date is cleared', () => {
        component.dateCleared();
        expect(emitted).toHaveBeenCalledWith({ date: null });
    });
});

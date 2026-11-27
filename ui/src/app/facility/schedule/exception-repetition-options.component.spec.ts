// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ExceptionDialogRepetitionOptionsComponent } from './exception-repetition-options.component';

describe('ExceptionDialogRepetitionOptionsComponent', () => {
    let component: ExceptionDialogRepetitionOptionsComponent;
    let fixture: ComponentFixture<ExceptionDialogRepetitionOptionsComponent>;

    // Days relative to today, so the pickers' initial "now" never interferes
    const at = (days: number, hour: number, minute = 0): Date => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        date.setHours(hour, minute, 0, 0);
        return date;
    };

    // Put the component in a valid state: begins in 1 day, ends in `days` days at `hour`
    const givenRange = (days: number, hour: number) => {
        component.endChanged({ date: at(days, hour) });
        component.startChanged({ date: at(1, 9) });
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ExceptionDialogRepetitionOptionsComponent, TranslateModule.forRoot()],
            providers: [provideZonelessChangeDetection()],
        }).compileComponents();

        TestBed.inject(TranslateService).use('en');
        fixture = TestBed.createComponent(ExceptionDialogRepetitionOptionsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('start date moved past end date', () => {
        it('should keep the ending time of day when it still comes after the starting time', () => {
            givenRange(3, 12);

            component.startChanged({ date: at(5, 9) });

            expect(component.endDate()).toEqual(at(5, 12));
        });

        it('should fall back to the starting time when the ending time is earlier', () => {
            givenRange(3, 8);

            component.startChanged({ date: at(5, 14) });

            expect(component.endDate()).toEqual(at(5, 14));
        });

        it('should fall back to the starting time when the times are equal', () => {
            givenRange(3, 9);

            component.startChanged({ date: at(5, 9) });

            expect(component.endDate()).toEqual(at(5, 9));
        });
    });

    it('should leave the end untouched when the start stays before it', () => {
        givenRange(10, 12);

        component.startChanged({ date: at(2, 9) });

        expect(component.endDate()).toEqual(at(10, 12));
    });
});

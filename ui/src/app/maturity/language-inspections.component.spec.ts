// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { Observable, of } from 'rxjs';
import { LanguageService } from 'src/app/shared/language/language.service';
import { vi } from 'vitest';
import { LanguageInspectionsComponent } from './language-inspections.component';
import { LanguageInspectionService } from './language-inspections.service';

describe('LanguageInspectionsComponent', () => {
    const query = vi.fn<(params: Record<string, number>) => Observable<never[]>>(() => of([]));

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [LanguageInspectionsComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                { provide: LanguageInspectionService, useValue: { query } },
                { provide: LanguageService, useValue: {} },
            ],
        });
        TestBed.overrideComponent(LanguageInspectionsComponent, { set: { imports: [], template: '' } });
    });

    it('should search from the start of the first day to the end of the last one', () => {
        const component = TestBed.createComponent(LanguageInspectionsComponent).componentInstance;
        const day = (d: number) => new Date(2030, 5, d);

        component.startDateChanged({ date: day(10) });
        component.endDateChanged({ date: day(12) });

        expect(query).toHaveBeenLastCalledWith({
            start: DateTime.local(2030, 6, 10).toMillis(),
            end: DateTime.local(2030, 6, 13).toMillis(),
        });
    });
});

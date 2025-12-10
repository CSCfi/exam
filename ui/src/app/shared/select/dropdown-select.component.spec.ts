// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NgbDropdown } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { vi } from 'vitest';
import { DropdownSelectComponent } from './dropdown-select.component';
import { Option } from './select.model';

describe('DropdownSelectComponent', () => {
    let component: DropdownSelectComponent<string, number>;
    let fixture: ComponentFixture<DropdownSelectComponent<string, number>>;

    const mockOptions: Option<string, number>[] = [
        { id: 1, label: 'Option 1', value: 'value1' },
        { id: 2, label: 'Option 2', value: 'value2' },
        { id: 3, label: 'Option 3', value: 'value3' },
        { id: 4, label: 'Header Option', value: 'value4', isHeader: true },
        { id: 5, label: 'Option 5', value: 'value5' },
    ];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DropdownSelectComponent, FormsModule, TranslateModule.forRoot(), NgbDropdown],
            providers: [provideZonelessChangeDetection()],
        }).compileComponents();

        fixture = TestBed.createComponent(DropdownSelectComponent<string, number>);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('initialization', () => {
        it('should initialize with all options when no filter', () => {
            fixture.componentRef.setInput('options', mockOptions);
            fixture.detectChanges();

            expect(component.filteredOptions().length).toBe(5);
        });

        it('should set initial selected option', () => {
            const initial = mockOptions[1];
            fixture.componentRef.setInput('options', mockOptions);
            fixture.componentRef.setInput('initial', initial);
            fixture.detectChanges();

            expect(component.selected()).toEqual(initial);
        });

        it('should initialize without selected option', () => {
            fixture.componentRef.setInput('options', mockOptions);
            fixture.detectChanges();

            expect(component.selected()).toBeUndefined();
        });
    });

    describe('filtering', () => {
        it('should refilter options when search filter changes', () => {
            fixture.componentRef.setInput('options', mockOptions);
            fixture.detectChanges();
            component.setSearchFilter('Option 1');
            fixture.detectChanges();

            expect(component.filteredOptions().length).toBe(1);
            expect(component.filteredOptions()[0].label).toBe('Option 1');
        });

        it('should update filtered options when options change', () => {
            fixture.componentRef.setInput('options', mockOptions.slice(0, 2));
            fixture.detectChanges();

            expect(component.filteredOptions().length).toBe(2);

            fixture.componentRef.setInput('options', mockOptions);
            fixture.detectChanges();

            expect(component.filteredOptions().length).toBe(5);
        });
    });

    describe('filterOptions', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('options', mockOptions);
            fixture.detectChanges();
        });

        it('should show all options when search filter is empty', () => {
            component.setSearchFilter('');
            fixture.detectChanges();

            expect(component.filteredOptions().length).toBe(5);
        });

        it('should filter options by label (case insensitive)', () => {
            component.setSearchFilter('option 1');
            fixture.detectChanges();

            expect(component.filteredOptions().length).toBe(1);
            expect(component.filteredOptions()[0].label).toBe('Option 1');
        });

        it('should filter options with partial match', () => {
            component.setSearchFilter('Option');
            fixture.detectChanges();

            expect(component.filteredOptions().length).toBe(5);
        });

        it('should limit results when limitTo is set', () => {
            fixture.componentRef.setInput('limitTo', 2);
            component.setSearchFilter('Option');
            fixture.detectChanges();

            expect(component.filteredOptions().length).toBe(2);
        });

        it('should show all filtered results when limitTo is 0', () => {
            fixture.componentRef.setInput('limitTo', 0);
            component.setSearchFilter('Option');
            fixture.detectChanges();

            expect(component.filteredOptions().length).toBe(5);
        });

        it('should show all filtered results when limitTo is undefined', () => {
            fixture.componentRef.setInput('limitTo', undefined);
            component.setSearchFilter('Option');
            fixture.detectChanges();

            expect(component.filteredOptions().length).toBe(5);
        });

        it('should return empty array when no matches', () => {
            component.setSearchFilter('nonexistent');
            fixture.detectChanges();

            expect(component.filteredOptions().length).toBe(0);
        });
    });

    describe('selectOption', () => {
        it('should set selected option', () => {
            const option = mockOptions[0];
            component.selectOption(option);
            fixture.detectChanges();

            expect(component.selected()).toEqual(option);
        });

        it('should emit optionSelected event', () => {
            const option = mockOptions[0];
            vi.spyOn(component.optionSelected, 'emit');

            component.selectOption(option);

            expect(component.optionSelected.emit).toHaveBeenCalledWith(option);
        });

        it('should update selected option when called multiple times', () => {
            component.selectOption(mockOptions[0]);
            fixture.detectChanges();
            expect(component.selected()).toEqual(mockOptions[0]);

            component.selectOption(mockOptions[1]);
            fixture.detectChanges();
            expect(component.selected()).toEqual(mockOptions[1]);
        });
    });

    describe('getClasses', () => {
        it('should return active class for selected option', () => {
            component.selectOption(mockOptions[0]);
            fixture.detectChanges();
            const classes = component.getClasses(mockOptions[0]);

            expect(classes).toContain('active');
        });

        it('should not return active class for non-selected option', () => {
            component.selectOption(mockOptions[0]);
            fixture.detectChanges();
            const classes = component.getClasses(mockOptions[1]);

            expect(classes).not.toContain('active');
        });

        it('should return dropdown-header class for header options', () => {
            const headerOption = mockOptions.find((o) => o.isHeader);
            const classes = component.getClasses(headerOption!);

            expect(classes).toContain('dropdown-header');
        });

        it('should not allow selecting header options', () => {
            const headerOption = mockOptions.find((o) => o.isHeader)!;
            // Even if a header is manually set as selected, getClasses should not return 'active'
            component.selected.set(headerOption);
            const classes = component.getClasses(headerOption);

            // Headers cannot be selected, so they should only have dropdown-header class
            expect(classes).not.toContain('active');
            expect(classes).toContain('dropdown-header');
            // Note: selected can be set manually, but getClasses prevents 'active' class for headers
        });

        it('should return empty array when no special classes apply', () => {
            component.selectOption(mockOptions[0]);
            fixture.detectChanges();
            const classes = component.getClasses(mockOptions[1]);

            expect(classes.length).toBe(0);
        });

        it('should return empty array when no option is selected', () => {
            component.clearSelection();
            fixture.detectChanges();
            const classes = component.getClasses(mockOptions[0]);

            expect(classes.length).toBe(0);
        });
    });

    describe('clearSelection', () => {
        it('should clear selected option', () => {
            component.selectOption(mockOptions[0]);
            fixture.detectChanges();
            component.clearSelection();
            fixture.detectChanges();

            expect(component.selected()).toBeUndefined();
        });

        it('should emit optionSelected event with undefined', () => {
            component.selectOption(mockOptions[0]);
            fixture.detectChanges();
            vi.spyOn(component.optionSelected, 'emit');

            component.clearSelection();

            expect(component.optionSelected.emit).toHaveBeenCalledWith(undefined);
        });

        it('should work when no option was selected', () => {
            component.clearSelection();
            fixture.detectChanges();
            vi.spyOn(component.optionSelected, 'emit');

            component.clearSelection();

            expect(component.selected()).toBeUndefined();
            expect(component.optionSelected.emit).toHaveBeenCalled();
        });
    });

    describe('filtering', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('options', mockOptions);
            fixture.detectChanges();
        });

        it('should filter options by matching label', () => {
            fixture.componentRef.setInput('options', mockOptions);
            fixture.detectChanges();
            component.setSearchFilter('Option 1');
            fixture.detectChanges();
            const result = component
                .filteredOptions()
                .some((opt: Option<string, number>) => opt.id === mockOptions[0].id);

            expect(result).toBe(true);
        });

        it('should exclude non-matching options', () => {
            component.setSearchFilter('Option 1');
            fixture.detectChanges();
            const result = component
                .filteredOptions()
                .some((opt: Option<string, number>) => opt.id === mockOptions[1].id);

            expect(result).toBe(false);
        });

        it('should be case insensitive', () => {
            component.setSearchFilter('option 1');
            fixture.detectChanges();
            const result = component
                .filteredOptions()
                .some((opt: Option<string, number>) => opt.id === mockOptions[0].id);

            expect(result).toBe(true);
        });

        it('should handle partial matches', () => {
            component.setSearchFilter('Opt');
            fixture.detectChanges();
            const result = component
                .filteredOptions()
                .some((opt: Option<string, number>) => opt.id === mockOptions[0].id);

            expect(result).toBe(true);
        });

        it('should exclude options with null label', () => {
            const optionsWithNull = [
                ...mockOptions,
                {
                    id: 99,
                    label: null as unknown as string,
                    value: 'x',
                } as Option<string, number>,
            ];
            fixture.componentRef.setInput('options', optionsWithNull);
            component.setSearchFilter('test');
            fixture.detectChanges();
            const result = component.filteredOptions().some((opt: Option<string, number>) => opt.id === 99);

            expect(result).toBe(false);
        });
    });

    describe('template integration', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('options', mockOptions);
            fixture.detectChanges();
        });

        it('should display placeholder when no option is selected', () => {
            const button = fixture.nativeElement.querySelector('button[ngbDropdownToggle]');
            expect(button.textContent.trim()).toContain('i18n_choose');
        });

        it('should display selected option label', () => {
            component.selectOption(mockOptions[0]);
            fixture.detectChanges();

            const button = fixture.nativeElement.querySelector('button[ngbDropdownToggle]');
            expect(button.textContent.trim()).toContain('Option 1');
        });

        it('should render search input when noSearch is false', () => {
            fixture.componentRef.setInput('noSearch', false);
            fixture.detectChanges();

            const input = fixture.nativeElement.querySelector('input[type="text"]');
            expect(input).toBeTruthy();
        });

        it('should not render search input when noSearch is true', () => {
            fixture.componentRef.setInput('noSearch', true);
            fixture.detectChanges();

            const input = fixture.nativeElement.querySelector('input[type="text"]');
            expect(input).toBeFalsy();
        });

        it('should render clear button when allowClearing is true', () => {
            fixture.componentRef.setInput('allowClearing', true);
            fixture.detectChanges();

            const clearButton = fixture.nativeElement.querySelector('button[ngbDropdownItem] i.bi-x');
            expect(clearButton).toBeTruthy();
        });

        it('should not render clear button when allowClearing is false', () => {
            fixture.componentRef.setInput('allowClearing', false);
            fixture.detectChanges();

            const clearButton = fixture.nativeElement.querySelector('button[ngbDropdownItem] i.bi-x');
            expect(clearButton).toBeFalsy();
        });

        it('should render all filtered options', () => {
            fixture.detectChanges();

            const optionButtons = fixture.nativeElement.querySelectorAll('button[ngbDropdownItem]');
            // +1 for clear button (if allowClearing is true)
            const allowClearing = component.allowClearing();
            expect(optionButtons.length).toBe(allowClearing ? 6 : 5);
        });

        it('should apply full-width class when fullWidth is true', () => {
            fixture.componentRef.setInput('fullWidth', true);
            fixture.detectChanges();

            const button = fixture.nativeElement.querySelector('button[ngbDropdownToggle]');
            expect(button.classList.contains('dropdown-select-full-width')).toBe(true);
        });

        it('should not apply full-width class when fullWidth is false', () => {
            fixture.componentRef.setInput('fullWidth', false);
            fixture.detectChanges();

            const button = fixture.nativeElement.querySelector('button[ngbDropdownToggle]');
            expect(button.classList.contains('dropdown-select-full-width')).toBe(false);
        });
    });
});

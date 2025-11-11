// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

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
        }).compileComponents();

        fixture = TestBed.createComponent(DropdownSelectComponent<string, number>);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('ngOnInit', () => {
        it('should initialize with all options when no filter', () => {
            component.options = mockOptions;
            component.ngOnInit();

            expect(component.filteredOptions.length).toBe(5);
        });

        it('should set initial selected option', () => {
            const initial = mockOptions[1];
            component.options = mockOptions;
            component.initial = initial;

            component.ngOnInit();

            expect(component.selected).toEqual(initial);
        });

        it('should initialize without selected option', () => {
            component.options = mockOptions;
            component.ngOnInit();

            expect(component.selected).toBeUndefined();
        });
    });

    describe('ngOnChanges', () => {
        it('should refilter options when called', () => {
            component.options = mockOptions;
            component.searchFilter = 'Option 1';
            component.ngOnChanges();

            expect(component.filteredOptions.length).toBe(1);
            expect(component.filteredOptions[0].label).toBe('Option 1');
        });

        it('should update filtered options when options change', () => {
            component.options = mockOptions.slice(0, 2);
            component.ngOnChanges();

            expect(component.filteredOptions.length).toBe(2);

            component.options = mockOptions;
            component.ngOnChanges();

            expect(component.filteredOptions.length).toBe(5);
        });
    });

    describe('filterOptions', () => {
        beforeEach(() => {
            component.options = mockOptions;
        });

        it('should show all options when search filter is empty', () => {
            component.searchFilter = '';
            component.filterOptions();

            expect(component.filteredOptions.length).toBe(5);
        });

        it('should filter options by label (case insensitive)', () => {
            component.searchFilter = 'option 1';
            component.filterOptions();

            expect(component.filteredOptions.length).toBe(1);
            expect(component.filteredOptions[0].label).toBe('Option 1');
        });

        it('should filter options with partial match', () => {
            component.searchFilter = 'Option';
            component.filterOptions();

            expect(component.filteredOptions.length).toBe(5);
        });

        it('should limit results when limitTo is set', () => {
            component.searchFilter = 'Option';
            component.limitTo = 2;
            component.filterOptions();

            expect(component.filteredOptions.length).toBe(2);
        });

        it('should show all filtered results when limitTo is 0', () => {
            component.searchFilter = 'Option';
            component.limitTo = 0;
            component.filterOptions();

            expect(component.filteredOptions.length).toBe(5);
        });

        it('should show all filtered results when limitTo is undefined', () => {
            component.searchFilter = 'Option';
            component.limitTo = undefined;
            component.filterOptions();

            expect(component.filteredOptions.length).toBe(5);
        });

        it('should return empty array when no matches', () => {
            component.searchFilter = 'nonexistent';
            component.filterOptions();

            expect(component.filteredOptions.length).toBe(0);
        });
    });

    describe('selectOption', () => {
        it('should set selected option', () => {
            const option = mockOptions[0];
            component.selectOption(option);

            expect(component.selected).toEqual(option);
        });

        it('should emit optionSelected event', () => {
            const option = mockOptions[0];
            vi.spyOn(component.optionSelected, 'emit');

            component.selectOption(option);

            expect(component.optionSelected.emit).toHaveBeenCalledWith(option);
        });

        it('should update selected option when called multiple times', () => {
            component.selectOption(mockOptions[0]);
            expect(component.selected).toEqual(mockOptions[0]);

            component.selectOption(mockOptions[1]);
            expect(component.selected).toEqual(mockOptions[1]);
        });
    });

    describe('getClasses', () => {
        it('should return active class for selected option', () => {
            component.selected = mockOptions[0];
            const classes = component.getClasses(mockOptions[0]);

            expect(classes).toContain('active');
        });

        it('should not return active class for non-selected option', () => {
            component.selected = mockOptions[0];
            const classes = component.getClasses(mockOptions[1]);

            expect(classes).not.toContain('active');
        });

        it('should return dropdown-header class for header options', () => {
            const headerOption = mockOptions.find((o) => o.isHeader);
            const classes = component.getClasses(headerOption!);

            expect(classes).toContain('dropdown-header');
        });

        it('should return both active and dropdown-header for selected header', () => {
            const headerOption = mockOptions.find((o) => o.isHeader)!;
            component.selected = headerOption;
            const classes = component.getClasses(headerOption);

            expect(classes).toContain('active');
            expect(classes).toContain('dropdown-header');
        });

        it('should return empty array when no special classes apply', () => {
            component.selected = mockOptions[0];
            const classes = component.getClasses(mockOptions[1]);

            expect(classes.length).toBe(0);
        });

        it('should return empty array when no option is selected', () => {
            component.selected = undefined;
            const classes = component.getClasses(mockOptions[0]);

            expect(classes.length).toBe(0);
        });
    });

    describe('clearSelection', () => {
        it('should clear selected option', () => {
            component.selected = mockOptions[0];
            component.clearSelection();

            expect(component.selected).toBeUndefined();
        });

        it('should emit optionSelected event with undefined', () => {
            component.selected = mockOptions[0];
            vi.spyOn(component.optionSelected, 'emit');

            component.clearSelection();

            expect(component.optionSelected.emit).toHaveBeenCalledWith();
        });

        it('should work when no option was selected', () => {
            component.selected = undefined;
            vi.spyOn(component.optionSelected, 'emit');

            component.clearSelection();

            expect(component.selected).toBeUndefined();
            expect(component.optionSelected.emit).toHaveBeenCalled();
        });
    });

    describe('labelFilter', () => {
        it('should return true for matching label', () => {
            component.searchFilter = 'Option 1';
            const result = component.labelFilter(mockOptions[0]);

            expect(result).toBe(true);
        });

        it('should return false for non-matching label', () => {
            component.searchFilter = 'Option 1';
            const result = component.labelFilter(mockOptions[1]);

            expect(result).toBe(false);
        });

        it('should be case insensitive', () => {
            component.searchFilter = 'option 1';
            const result = component.labelFilter(mockOptions[0]);

            expect(result).toBe(true);
        });

        it('should handle partial matches', () => {
            component.searchFilter = 'Opt';
            const result = component.labelFilter(mockOptions[0]);

            expect(result).toBe(true);
        });

        it('should return false for null label', () => {
            component.searchFilter = 'test';
            const optionWithNullLabel: Option<string, number> = {
                id: 99,
                label: null as unknown as string,
                value: 'x',
            };
            const result = component.labelFilter(optionWithNullLabel);

            expect(result).toBe(false);
        });
    });

    describe('template integration', () => {
        beforeEach(() => {
            component.options = mockOptions;
            fixture.detectChanges();
        });

        it('should display placeholder when no option is selected', () => {
            const button = fixture.nativeElement.querySelector('button[ngbDropdownToggle]');
            expect(button.textContent.trim()).toContain('i18n_choose');
        });

        it('should display selected option label', () => {
            component.selected = mockOptions[0];
            fixture.detectChanges();

            const button = fixture.nativeElement.querySelector('button[ngbDropdownToggle]');
            expect(button.textContent.trim()).toContain('Option 1');
        });

        it('should render search input when noSearch is false', () => {
            component.noSearch = false;
            fixture.detectChanges();

            const input = fixture.nativeElement.querySelector('input[type="text"]');
            expect(input).toBeTruthy();
        });

        it('should not render search input when noSearch is true', () => {
            component.noSearch = true;
            fixture.detectChanges();

            const input = fixture.nativeElement.querySelector('input[type="text"]');
            expect(input).toBeFalsy();
        });

        it('should render clear button when allowClearing is true', () => {
            component.allowClearing = true;
            fixture.detectChanges();

            const clearButton = fixture.nativeElement.querySelector('button[ngbDropdownItem] i.bi-x');
            expect(clearButton).toBeTruthy();
        });

        it('should not render clear button when allowClearing is false', () => {
            component.allowClearing = false;
            fixture.detectChanges();

            const clearButton = fixture.nativeElement.querySelector('button[ngbDropdownItem] i.bi-x');
            expect(clearButton).toBeFalsy();
        });

        it('should render all filtered options', () => {
            component.ngOnInit();
            fixture.detectChanges();

            const optionButtons = fixture.nativeElement.querySelectorAll('button[ngbDropdownItem]');
            // +1 for clear button (if allowClearing is true)
            expect(optionButtons.length).toBe(component.allowClearing ? 6 : 5);
        });

        it('should apply full-width class when fullWidth is true', () => {
            component.fullWidth = true;
            fixture.detectChanges();

            const button = fixture.nativeElement.querySelector('button[ngbDropdownToggle]');
            expect(button.classList.contains('dropdown-select-full-width')).toBe(true);
        });

        it('should not apply full-width class when fullWidth is false', () => {
            component.fullWidth = false;
            fixture.detectChanges();

            const button = fixture.nativeElement.querySelector('button[ngbDropdownToggle]');
            expect(button.classList.contains('dropdown-select-full-width')).toBe(false);
        });
    });
});

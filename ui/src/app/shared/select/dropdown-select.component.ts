// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Option } from './select.model';

@Component({
    selector: 'xm-dropdown-select',
    template: `<div ngbDropdown #d="ngbDropdown" autoClose="outside" (openChange)="dropdownOpenChange.emit($event)">
        <button
            ngbDropdownToggle
            class="btn btn-outline-secondary"
            [class.dropdown-select-full-width]="fullWidth()"
            type="button"
            [ariaHasPopup]="true"
            [ariaExpanded]="d.isOpen()"
            [id]="menuTriggerId"
        >
            {{ selected()?.label || placeholder() | translate }}
        </button>
        <div ngbDropdownMenu class="xm-scrollable-menu" role="menu" [attr.aria-labelledby]="menuTriggerId">
            @if (!noSearch()) {
                <div class="input-group p-1">
                    <input
                        type="text"
                        [value]="searchFilter()"
                        (input)="onSearchFilterInput($event)"
                        class="form-control"
                        placeholder="{{ placeholder() | translate }}"
                    />
                    <div class="input-group-append bi-search search-append"></div>
                </div>
            }
            @if (allowClearing()) {
                <button type="button" ngbDropdownItem (click)="clearSelection(); d.close()">
                    <i class="bi-x text text-danger"></i>
                </button>
            }
            @for (opt of filteredOptions(); track $index) {
                <button
                    type="button"
                    ngbDropdownItem
                    [class]="getClasses(opt)"
                    [disabled]="!!opt.isHeader"
                    (click)="selectOption(opt); d.close()"
                >
                    @if (!opt.isHeader) {
                        {{ opt.label || '' | translate }}
                    } @else {
                        {{ opt.label }}
                    }
                </button>
            }
        </div>
    </div>`,
    imports: [NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem, TranslateModule],
    styleUrl: './dropdown-select.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownSelectComponent<V, I> {
    private static instanceCount = 0;

    readonly options = input<Option<V, I>[]>([]);
    readonly initial = input<Option<V, I> | undefined>(undefined);
    readonly placeholder = input('i18n_choose');
    readonly limitTo = input<number | undefined>(undefined);
    readonly fullWidth = input(false);
    readonly noSearch = input(false);
    readonly allowClearing = input(true);
    /** When true, selection is cleared after each option select (for filter-style multi-select). */
    readonly clearAfterSelect = input(false);
    readonly optionSelected = output<Option<V, I> | undefined>();
    /** Emits when the dropdown opens or closes (payload is open: boolean). Use to load data on open. */
    readonly dropdownOpenChange = output<boolean>();

    readonly menuTriggerId = `xm-dropdown-select-${++DropdownSelectComponent.instanceCount}`;
    readonly searchFilter = signal('');
    readonly selected = signal<Option<V, I> | undefined>(undefined);

    readonly filteredOptions = computed(() => {
        const optionsValue = this.options();
        const searchFilterValue = this.searchFilter();
        const limitToValue = this.limitTo();

        const filtered = optionsValue.filter(
            (option) => option.label != null && option.label.toLowerCase().includes(searchFilterValue.toLowerCase()),
        );

        if (!limitToValue) {
            return filtered;
        } else {
            return filtered.slice(0, limitToValue);
        }
    });

    constructor() {
        effect(() => {
            const initial = this.initial();
            if (initial !== undefined) {
                this.selected.set(initial);
            }
        });
    }

    onSearchFilterInput = (event: Event) => this.setSearchFilter((event.target as HTMLInputElement).value);

    setSearchFilter(value: string) {
        this.searchFilter.set(value);
    }

    selectOption(option: Option<V, I>) {
        if (option.isHeader) {
            return; // Headers are not selectable
        }
        this.selected.set(option);
        this.optionSelected.emit(option);
        if (this.clearAfterSelect()) {
            this.selected.set(undefined);
            this.searchFilter.set('');
        }
    }

    getClasses(option: Option<V, I>): string[] {
        const classes: string[] = [];
        const selected = this.selected();
        if (selected && selected.id === option.id && !option.isHeader) {
            classes.push('active');
        }
        if (option.isHeader) {
            classes.push('dropdown-header');
        }
        return classes;
    }

    clearSelection() {
        this.selected.set(undefined);
        this.optionSelected.emit(undefined);
    }
}

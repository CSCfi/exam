// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Option } from './select.model';

@Component({
    selector: 'xm-dropdown-select',
    template: `<div ngbDropdown #d="ngbDropdown" autoClose="outside" (openChange)="dropdownOpenChange.emit($event)">
        <button
            ngbDropdownToggle
            class="btn btn-outline-secondary"
            [ngClass]="{ 'dropdown-select-full-width': fullWidth() }"
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
                        [ngModel]="searchFilter()"
                        (ngModelChange)="setSearchFilter($event)"
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
                    [ngClass]="getClasses(opt)"
                    [disabled]="!!opt.isHeader"
                    (click)="!opt.isHeader && selectOption(opt); !opt.isHeader && d.close()"
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
    imports: [NgbDropdown, NgbDropdownToggle, NgClass, NgbDropdownMenu, FormsModule, NgbDropdownItem, TranslateModule],
    styleUrl: './dropdown-select.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownSelectComponent<V, I> {
    private static instanceCount = 0;
    readonly menuTriggerId = `xm-dropdown-select-${++DropdownSelectComponent.instanceCount}`;

    options = input<Option<V, I>[]>([]);
    initial = input<Option<V, I> | undefined>(undefined);
    placeholder = input('i18n_choose');
    limitTo = input<number | undefined>(undefined);
    fullWidth = input(false);
    noSearch = input(false);
    allowClearing = input(true);
    /** When true, selection is cleared after each option select (for filter-style multi-select). */
    clearAfterSelect = input(false);
    optionSelected = output<Option<V, I> | undefined>();
    /** Emits when the dropdown opens or closes (payload is open: boolean). Use to load data on open. */
    dropdownOpenChange = output<boolean>();

    searchFilter = signal('');
    selected = signal<Option<V, I> | undefined>(undefined);

    filteredOptions = computed(() => {
        const optionsValue = this.options();
        const searchFilterValue = this.searchFilter();
        const limitToValue = this.limitTo();

        const filtered = optionsValue.filter(
            (option) => option.label != null && option.label.toLowerCase().includes(searchFilterValue.toLowerCase()),
        );

        // Show all options, if limit is set to 0
        if (!limitToValue || limitToValue === 0) {
            return filtered;
        } else {
            return filtered.slice(0, limitToValue);
        }
    });

    constructor() {
        // Use initial as default value once (before user makes a selection)
        effect(() => {
            if (this.selected() === undefined && this.initial() !== undefined) {
                this.selected.set(this.initial());
            }
        });
    }

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

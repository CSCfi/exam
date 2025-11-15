// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Option } from './select.model';

@Component({
    selector: 'xm-dropdown-select',
    template: `<div ngbDropdown #d="ngbDropdown" autoClose="outside">
        <button
            ngbDropdownToggle
            class="btn btn-outline-secondary"
            [ngClass]="{ 'dropdown-select-full-width': fullWidth() }"
            type="button"
            aria-haspopup="true"
            aria-expanded="true"
            id="dd1"
        >
            {{ selected()?.label || placeholder() | translate }}
        </button>
        <div ngbDropdownMenu class="xm-scrollable-menu" role="menu" aria-labelledby="dd1">
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
                    (click)="selectOption(opt); d.close()"
                >
                    @if (!opt.isHeader) {
                        <span>
                            {{ opt.label || '' | translate | slice: 0 : 40 }}
                        </span>
                    }
                    @if (opt.isHeader) {
                        <span>{{ opt.label }}</span>
                    }
                </button>
            }
        </div>
    </div>`,
    imports: [
        NgbDropdown,
        NgbDropdownToggle,
        NgClass,
        NgbDropdownMenu,
        FormsModule,
        NgbDropdownItem,
        SlicePipe,
        TranslateModule,
    ],
    styleUrl: './dropdown-select.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownSelectComponent<V, I> {
    options = input<Option<V, I>[]>([]);
    initial = input<Option<V, I> | undefined>(undefined);
    placeholder = input('i18n_choose');
    limitTo = input<number | undefined>(undefined);
    fullWidth = input(false);
    noSearch = input(false);
    allowClearing = input(true);
    optionSelected = output<Option<V, I> | undefined>();

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
        // Sync initial input to selected signal only on first load (before user makes a selection)
        effect(() => {
            const initialValue = this.initial();
            const currentSelected = this.selected();
            // Only sync from initial if no selection has been made yet (initial is just a default value)
            // Once user selects an option, ignore future changes to initial
            if (initialValue !== undefined && currentSelected === undefined) {
                this.selected.set(initialValue);
            }
            // When initial is undefined or user has already selected, don't interfere
        });
    }

    setSearchFilter(value: string) {
        this.searchFilter.set(value);
    }

    selectOption(option: Option<V, I>) {
        this.selected.set(option);
        this.optionSelected.emit(option);
    }

    getClasses(option: Option<V, I>): string[] {
        const classes: string[] = [];
        const currentSelected = this.selected();
        if (currentSelected && currentSelected.id === option.id) {
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

/*
 *
 *  * Copyright (c) 2018 Exam Consortium
 *  *
 *  * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 *  * versions of the EUPL (the "Licence");
 *  * You may not use this work except in compliance with the Licence.
 *  * You may obtain a copy of the Licence at:
 *  *
 *  * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *  *
 *  * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 *  * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  * See the Licence for the specific language governing permissions and limitations under the Licence.
 *
 */
import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { OnInit, OnChanges } from '@angular/core';

interface Selection {
    value: unknown;
}

export interface Option {
    value?: unknown;
    id: unknown | null;
    label: string | null;
    isHeader?: boolean;
}

@Component({
    selector: 'dropdown-select',
    templateUrl: './dropDownSelect.component.html',
})
export class DropdownSelectComponent implements OnInit, OnChanges {
    @Input() options: Option[] = []; // everything
    @Input() placeholder = '-';
    @Input() limitTo?: number;
    @Input() fullWidth?: boolean = false;
    @Output() onSelect = new EventEmitter<Selection>();
    filteredOptions: Option[] = []; // filtered
    searchFilter = '';
    selected?: Option;

    ngOnInit() {
        this.limitTo = !this.limitTo && this.limitTo !== 0 ? 15 : this.limitTo;
    }

    ngOnChanges() {
        this.filterOptions();
    }

    labelFilter = (option: Option): boolean =>
        option.label != null && option.label.toLowerCase().includes(this.searchFilter.toLowerCase());

    filterOptions = () => {
        // Show all options, if limit is set to 0
        if (!this.limitTo || this.limitTo === 0) {
            this.filteredOptions = this.options.filter(this.labelFilter);
        } else {
            this.filteredOptions = this.options.filter(this.labelFilter).slice(0, this.limitTo);
        }
    };

    selectOption = (option: Option) => {
        this.selected = option;
        this.onSelect.emit({ value: option.value || option.id });
    };

    getClasses = (option: Option): string[] => {
        const classes: string[] = [];
        if (this.selected && this.selected.id === option.id) {
            classes.push('active');
        }
        if (option.isHeader) {
            classes.push('dropdown-header');
        }
        return classes;
    };

    clearSelection = () => {
        delete this.selected;
        this.onSelect.emit();
    };
}

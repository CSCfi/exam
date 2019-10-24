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
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';

interface Selection {
    value: any;
}

export interface Option {
    value?: any;
    id: any | null;
    label: string | null;
    isHeader?: boolean;
}

@Component({
    selector: 'dropdown-select',
    template: require('./dropDownSelect.component.html'),
})
export class DropdownSelectComponent implements OnChanges, OnInit {
    @Input() options: Option[] = []; // everything
    @Input() placeholder = '-';
    @Input() limitTo?: number;
    @Output() onSelect = new EventEmitter<Selection>();
    filteredOptions: Option[]; // filtered
    searchFilter = '';
    selected: Option;
    labelFilter: (_: Option) => boolean;

    ngOnInit() {
        this.filterOptions();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (this.options && changes.options) {
            this.searchFilter = this.searchFilter || '';
            this.filterOptions();
        }
    }

    filterOptions = () => (this.filteredOptions = this.options.filter(this.labelFilter).slice(0, this.limitTo));

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

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
import * as angular from 'angular';

declare function require(name: string): any;

interface Selection {
    value: any;
}

export interface Option {
    value?: any;
    id: any | null;
    label: string | null;
    isHeader?: boolean;
}

export const DropDownSelectComponent: angular.IComponentOptions = {
    template: require('./dropDownSelect.template.html'),
    bindings: {
        options: '<',
        limitTo: '<',
        placeholder: '@',
        onSelect: '&'
    },
    controller: class DropDownSelectController implements angular.IComponentController {
        options: Option[]; // everything
        filteredOptions: Option[]; // filtered
        limitTo?: number;
        placeholder: string;
        onSelect: (_?: Selection) => void;
        searchFilter: string;
        selected: Option;
        labelFilter: (_: Option) => boolean;

        constructor() {
            this.labelFilter = (option: Option): boolean => {
                return option.label != null &&
                    option.label.toLowerCase().includes(this.searchFilter.toLowerCase());
            };
        }

        $onInit() {
            this.options = this.options || [];
            this.placeholder = this.placeholder || '-';
            this.limitTo = this.limitTo || 15;
            this.searchFilter = '';
            this.filterOptions();
        }

        $onChanges(changes: angular.IOnChangesObject) {
            if (this.options && changes.options) {
                this.searchFilter = this.searchFilter || '';
                this.filterOptions();
            }
        }

        filterOptions() {
            this.filteredOptions = this.options.filter(this.labelFilter).slice(0, this.limitTo);
        }

        selectOption(option: Option) {
            this.selected = option;
            this.onSelect({ value: option.value || option.id });
        }

        getClasses(option: Option): string[] {
            const classes: string[] = [];
            if (this.selected && this.selected.id === option.id) {
                classes.push('active');
            }
            if (option.isHeader) {
                classes.push('dropdown-header');
            }
            return classes;
        }

        clearSelection = () => {
            delete this.selected;
            this.onSelect();
        }
    }
};

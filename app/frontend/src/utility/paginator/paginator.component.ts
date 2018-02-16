/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

import * as angular from 'angular';
import * as _ from 'lodash';
import { IOnChangesObject } from 'angular';

export const PaginatorComponent: angular.IComponentOptions = {
    template:
        `<ul class="pagination pagination-sm">
            <li ng-class="$ctrl.previousPageDisabled()"><a href="" ng-click="$ctrl.previousPage()">&#60;</a></li>
            <li ng-repeat="n in $ctrl.range()" ng-class="{active: $ctrl.isCurrent(n)}" ng-click="$ctrl.setPage(n)">
                <a href="">{{ $ctrl.printRange(n) }}</a>
            </li>
            <li ng-class="$ctrl.nextPageDisabled()"><a target="_blank" ng-click="$ctrl.nextPage()">&#62;</a></li>
        </ul>`,
    bindings: {
        items: '<',
        pageSize: '<',
        currentPage: '<',
        onSelectPage: '&'
    },
    controller: class PaginatorController implements angular.IComponentController {
        items: any[] = [];
        pageSize = 0;
        currentPage = 0;
        pageCount = 0;
        onSelectPage: (_: { page: number }) => any;

        constructor() { }

        $onChanges(props: IOnChangesObject) {
            if (props.items) {
                this.pageCount = Math.ceil(this.items.length / this.pageSize) - 1;
                // Go to first page always when the underlying collection gets modified
                this.currentPage = 0;
                this.onSelectPage({ page: 0 });
            }
        }

        printRange = (n: number) => n + 1;

        previousPage = () => {
            if (this.currentPage > 0) {
                this.currentPage--;
                this.onSelectPage({ page: this.currentPage });
            }
        }

        isCurrent = (n: number) => n === this.currentPage;

        previousPageDisabled = () => this.currentPage === 0 ? 'disabled' : '';

        nextPage = () => {
            if (this.currentPage < this.pageCount) {
                this.currentPage++;
                this.onSelectPage({ page: this.currentPage });
            }
        }

        nextPageDisabled = () => this.currentPage === this.pageCount ? 'disabled' : '';

        range = () => _.range(0, this.pageCount + 1);

        setPage = (n) => {
            this.currentPage = n;
            this.onSelectPage({ page: n });
        }

    }
};

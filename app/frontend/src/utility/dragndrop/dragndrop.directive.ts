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
import * as toast from 'toastr';
import { IDirective, IDirectiveFactory, IScope, IAttributes, IAugmentedJQuery } from 'angular';

import 'jquery-ui/ui/widgets/draggable';
import 'jquery-ui/ui/widgets/droppable';
import 'jquery-ui/ui/widgets/sortable';
import 'jquery-ui/ui/disable-selection';

interface SortableScope extends IScope {
    onMove: (x: any) => void;
    objects: any[];
    selection: string;
}

export class SortableDirective implements IDirective<SortableScope> {
    restrict = 'A';
    scope = {
        onMove: '&',
        objects: '=',
        selection: '@selection'
    };
    link(scope: SortableScope, element: IAugmentedJQuery, attrs: IAttributes) {
        let startIndex = -1;
        element.sortable({
            items: scope.selection,
            start: (event, ui) => {
                // on start we define where the item is dragged from
                startIndex = ($(ui.item).index());
            },
            stop: (event, ui) => {
                // on stop we determine the new index of the
                // item and store it there
                const newIndex = ($(ui.item).index());
                const objToMove = scope.objects[startIndex];
                scope.objects.splice(startIndex, 1);
                scope.objects.splice(newIndex, 0, objToMove);
                // we move items in the array, propagate update to angular as well
                // since we're outside its lifecycle
                scope.onMove({ object: objToMove, from: startIndex, to: newIndex });
            },
            axis: 'y'
        });
    }

    static factory(): IDirectiveFactory {
        return () => new SortableDirective();
    }
}

export class DraggableModalDirective implements IDirective {
    restrict = 'A';
    link = (scope: IScope, element: IAugmentedJQuery, attrs: IAttributes) => {
        element.draggable({
            revert: false,
            drag: () => element.css('height', 'auto')
        });
    }

    static factory(): IDirectiveFactory {
        return () => new DraggableModalDirective();
    }
}

interface DroppableScope extends IScope {
    objects: any[];
    identifier: string;
    onMove: (x: any) => void;
    onCreate: (x: any) => void;
}

export class DroppableDirective implements IDirective {

    restrict = 'A';
    scope = {
        objects: '=',
        identifier: '=',
        onMove: '&',
        onCreate: '&'
    };

    constructor(
        private $parse: angular.IParseService,
        private $translate: angular.translate.ITranslateService
    ) { 'ngInject'; }

    link = (scope: DroppableScope, element: IAugmentedJQuery, attrs: IAttributes) => {
        let startIndex = -1;

        const initDroppable = (scope: DroppableScope, element: IAugmentedJQuery, dropDisabled: boolean) => {
            element.droppable({
                drop: (event: Event, ui: JQueryUI.DroppableEventUIParam) => {
                    if (dropDisabled) {
                        toast.error(this.$translate.instant('sitnet_error_drop_disabled_lottery_on'));
                    } else if (!ui.draggable.hasClass('draggable') &&
                        !ui.draggable.hasClass('sortable-' + scope.identifier)) {
                        toast.warning(this.$translate.instant('sitnet_move_between_sections_disabled'));
                    }
                }
            });

            element.sortable({
                disabled: dropDisabled,
                items: '.sortable-' + scope.identifier,
                axis: 'y',
                start: (event, ui) => {
                    startIndex = ($(ui.item).index());
                },
                stop: function (event: JQueryEventObject, ui) {
                    const newIndex = ($(ui.item).index());
                    const toMove = scope.objects[startIndex];
                    if (!toMove) {
                        return;
                    }
                    scope.objects.splice(startIndex, 1);
                    scope.objects.splice(newIndex, 0, toMove);

                    // we move items in the array, propagate update to angular as well
                    // since we're outside its digest
                    scope.onMove({ from: startIndex, to: newIndex });
                },
            });

            element.disableSelection();

        };

        attrs.$observe('dropDisabled', () => {
            const dropDisabled = this.$parse(attrs.dropDisabled)(scope);
            initDroppable(scope, element, dropDisabled);
        });

    }

    static factory(): IDirectiveFactory {
        const directive = (
            $parse: angular.IParseService,
            $translate: angular.translate.ITranslateService
        ) => new DroppableDirective($parse, $translate);
        directive.$inject = ['$parse', '$translate'];
        return directive;
    }
}

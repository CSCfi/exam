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
/// <reference types="ckeditor" />
/// <reference types="mathjax" />

import * as angular from 'angular';
import * as _ from 'lodash';
import * as moment from 'moment';
import { IAttributes, IAugmentedJQuery, IDirective, IDirectiveFactory, INgModelController, IScope } from 'angular';

// MOVE TO UTIL/DATE
export class DateValidator implements IDirective {
    require = 'ngModel';

    link(scope: IScope, element: IAugmentedJQuery, attributes: IAttributes, ngModel: INgModelController) {
        const validate = (value: string | null) => {
            if (value !== null) {
                ngModel.$setValidity('correctDate', moment(value, 'DD.MM.YYYY').isValid());
            }
        };

        scope.$watch(() => ngModel.$viewValue, validate);
    }

    static factory(): IDirectiveFactory {
        return () => new DateValidator();
    }
}

interface ClozeTestScope extends IScope {
    results: Record<string, any>;
    content: string;
    editable: boolean;
}
export class ClozeTest implements IDirective<ClozeTestScope> {
    restrict = 'E';
    scope = {
        results: '=',
        content: '=',
        editable: '=?',
    };

    constructor(private $compile: angular.ICompileService) {}

    link(scope: ClozeTestScope, element: IAugmentedJQuery) {
        const editable = _.isUndefined(scope.editable) || scope.editable; // defaults to true

        /* 
            Add span tags with ngNonBindable directive to prevent AngularJS interpolation 
            (if strings surrounded by multiple curly braces are present).
        */
        const regexMultipleCurlyBraces = /\{{2,}(.*?)\}{2,}/g;
        const escapedContent = scope.content.replace(
            regexMultipleCurlyBraces,
            match => `<span ng-non-bindable>${match}</span>`,
        );

        const replacement = angular.element(escapedContent);
        const inputs = replacement.find('input');

        const padding = 2; // add some extra length so that all characters are more likely to fit in the input field
        for (let i = 0; i < inputs.length; ++i) {
            const input = inputs[i];
            const id = input.getAttribute('id');
            const answer = scope.results ? scope.results[input.id] : null;
            if (answer) {
                input.setAttribute('size', answer.length + padding);
            }
            input.setAttribute('ng-model', 'results.' + id);
            if (!editable) {
                input.setAttribute('ng-disabled', 'true');
            }
        }
        element.replaceWith(replacement);
        this.$compile(replacement)(scope);
    }

    static factory(): IDirectiveFactory {
        const directive = ($compile: angular.ICompileService) => new ClozeTest($compile);
        directive.$inject = ['$compile'];
        return directive;
    }
}

interface CkEditorScope extends IScope {
    enableClozeTest: boolean;
}
export class CkEditor implements IDirective<CkEditorScope> {
    require = 'ngModel';
    scope = {
        enableClozeTest: '=?',
    };

    constructor(private $translate: angular.translate.ITranslateService) {}

    link(scope: CkEditorScope, element: IAugmentedJQuery, attributes: IAttributes, ngModel: INgModelController) {
        // We need to disable some paste tools when cloze test editing is ongoing. There's a risk that
        // dysfunctional formatting gets pasted which can break the cloze test markup.
        const removals = scope.enableClozeTest ? 'Underline,Paste,PasteFromWord' : 'Underline,Cloze';
        const ck = CKEDITOR.replace(element[0] as HTMLTextAreaElement, {
            removeButtons: removals,
            language: this.$translate.use(),
        });

        let modelValue: string;
        ck.on('instanceReady', () => {
            ck.setData(modelValue);
        });

        const updateModel = () => _.defer(() => scope.$apply(() => ngModel.$setViewValue(ck.getData())));

        // These events can bring down the UI if not debounced
        ck.on('change', _.debounce(updateModel, 500));
        ck.on('dataReady', _.debounce(updateModel, 500));
        ck.on('key', _.debounce(updateModel, 500));
        ck.on('mode', updateModel); // Editing mode change

        ngModel.$render = () => {
            modelValue = ngModel.$modelValue;
            ck.setData(ngModel.$viewValue);
        };
    }

    static factory(): IDirectiveFactory {
        const directive = ($translate: angular.translate.ITranslateService) => new CkEditor($translate);
        directive.$inject = ['$translate'];
        return directive;
    }
}

export class FixedPrecision implements IDirective {
    restrict = 'A';
    require = 'ngModel';
    link(scope: IScope, element: IAugmentedJQuery, attributes: IAttributes, ngModel: INgModelController) {
        const toFixed = (input: number) => {
            if (!input) {
                input = 0;
            }
            const re = /^-?[0-9]+(\.[0-9]{1,2})?$/i;
            if (!input.toString().match(re)) {
                const fixed = parseFloat(input.toFixed(2));
                ngModel.$setViewValue(fixed);
                ngModel.$render();
                return fixed;
            }
            return input;
        };
        ngModel.$parsers.push(toFixed);
    }

    static factory(): IDirectiveFactory {
        return () => new FixedPrecision();
    }
}

export class UiBlur implements IDirective {
    restrict = 'A';

    constructor(private $parse: angular.IParseService) {}

    link(scope: IScope, element: IAugmentedJQuery, attributes: angular.IAttributes) {
        const expr: angular.ICompiledExpression = this.$parse(attributes.uiBlur);
        element.bind('blur', () => expr(scope));
    }

    static factory(): IDirectiveFactory {
        const directive = ($parse: angular.IParseService) => new UiBlur($parse);
        directive.$inject = ['$parse'];
        return directive;
    }
}

export class UiChange implements IDirective {
    restrict = 'A';

    constructor(private $parse: angular.IParseService) {}

    link(scope: IScope, element: IAugmentedJQuery, attributes: angular.IAttributes) {
        const expr: angular.ICompiledExpression = this.$parse(attributes.uiChange);
        element.bind('change', () => expr(scope));
    }

    static factory(): IDirectiveFactory {
        const directive = ($parse: angular.IParseService) => new UiChange($parse);
        directive.$inject = ['$parse'];
        return directive;
    }
}

export class FileModel implements IDirective {
    restrict = 'A';

    constructor(private $parse: angular.IParseService) {}

    link(scope: IScope, element: any, attributes: angular.IAttributes) {
        const modelSetter = this.$parse(attributes.fileModel).assign;
        element.bind('change', () => scope.$apply(() => modelSetter(scope.$parent, element[0].files[0])));
    }

    static factory(): IDirectiveFactory {
        const directive = ($parse: angular.IParseService) => new FileModel($parse);
        directive.$inject = ['$parse'];
        return directive;
    }
}

export class FileSelector implements IDirective {
    restrict = 'A';
    require = 'ngModel';

    constructor(private $parse: angular.IParseService) {}

    link(scope: IScope, element: IAugmentedJQuery, attributes: IAttributes, ngModel: angular.INgModelController) {
        const input = element[0] as HTMLInputElement;
        element.bind('change', () => ngModel.$setViewValue(input.files ? input.files[0] : undefined));
    }

    static factory(): IDirectiveFactory {
        const directive = ($parse: angular.IParseService) => new FileSelector($parse);
        directive.$inject = ['$parse'];
        return directive;
    }
}

export class MathJaxLoader implements IDirective {
    restrict = 'A';

    link(scope: IScope, element: IAugmentedJQuery, attributes: IAttributes) {
        scope.$watch(attributes.ngModel, () => MathJax.Hub.Queue(['Typeset', MathJax.Hub, element.get(0)]));
    }

    static factory(): IDirectiveFactory {
        return () => new MathJaxLoader();
    }
}

export class FocusOn implements IDirective {
    link(scope: IScope, element: IAugmentedJQuery, attributes: IAttributes) {
        scope.$on('focusOn', (el, name) => {
            if (name === attributes.focusOn) {
                element[0].focus();
            }
        });
    }
    static factory(): IDirectiveFactory {
        return () => new FocusOn();
    }
}

export class Lowercase implements IDirective {
    require = 'ngModel';
    link(scope: IScope, element: IAugmentedJQuery, attributes: IAttributes, ngModel: angular.INgModelController) {
        const toLowerCase = (input: string) => {
            const lc = (input || '').toLowerCase();
            if (lc !== input) {
                ngModel.$setViewValue(lc);
                ngModel.$render();
            }
            return lc;
        };
        ngModel.$parsers.push(toLowerCase);
    }
    static factory(): IDirectiveFactory {
        return () => new Lowercase();
    }
}

// TOD: turn into a component
interface SortScope extends IScope {
    predicate: string;
    by: string;
    text: string;
    reverse: boolean;
    onSort: () => void;
    sort: () => void;
    getSortClass: () => string;
}
export class Sort implements IDirective<SortScope> {
    restrict = 'A';
    template = `<span class="pointer" ng-click="sort()">{{ text | translate }}&nbsp;
            <i class="fa" ng-class="getSortClass()"></i>
        </span>`;
    scope = {
        predicate: '=',
        by: '@by',
        text: '@text',
        reverse: '=',
        onSort: '&?',
    };

    constructor(private $timeout: angular.ITimeoutService) {}

    link(scope: SortScope) {
        scope.sort = () => {
            scope.predicate = scope.by;
            scope.reverse = !scope.reverse;
            if (scope.onSort) {
                this.$timeout(scope.onSort);
            }
        };
        scope.getSortClass = () =>
            scope.predicate === scope.by ? (scope.reverse ? 'fa-caret-down' : 'fa-caret-up') : 'fa-sort';
    }

    static factory(): IDirectiveFactory {
        const directive = ($timeout: angular.ITimeoutService) => new Sort($timeout);
        directive.$inject = ['$timeout'];
        return directive;
    }
}

// TODO: turn into a component
interface TeacherListScope extends IScope {
    exam: {
        examOwners: { firstName: string; lastName: string }[];
        examInspections: { firstName: string; lastName: string }[];
    };
    useParent: boolean;
}
export class TeacherList implements IDirective<TeacherListScope> {
    restrict = 'E';
    replace = false;
    transclude = false;
    scope = {
        exam: '=exam',
        useParent: '<?',
    };
    template = `
    <div>
        <span ng-if="!useParent" ng-repeat="owner in exam.examOwners">
            <strong>{{owner.firstName}} {{owner.lastName}}{{$last ? "" : ", ";}}</strong>
        </span>
        <span ng-if="useParent" ng-repeat="owner in exam.parent.examOwners">
            <strong>{{owner.firstName}} {{owner.lastName}}{{$last ? "" : ", ";}}</strong>
        </span>
        <span ng-repeat="inspection in exam.examInspections">{{$first ? ", " : "";}}
            {{inspection.user.firstName}} {{inspection.user.lastName}}{{$last ? "" : ", ";}}
        </span>
    </div>`;

    static factory(): IDirectiveFactory {
        return () => new TeacherList();
    }
}

export class NgEnter implements IDirective {
    link(scope: IScope, element: IAugmentedJQuery, attributes: IAttributes) {
        element.bind('keydown', event => {
            if (event.key === 'Enter' || event.keyCode === 13) {
                scope.$apply(() => {
                    scope.$eval(attributes.ngEnter);
                });

                event.preventDefault();
            }
        });
    }
    static factory(): IDirectiveFactory {
        return () => new NgEnter();
    }
}

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
import {
    IAttributes, IAugmentedJQuery, IDirective, IDirectiveFactory, INgModelController, IScope,
    ICompiledExpression
} from 'angular';

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

// MOVE TO EXAM/EDITOR
interface UniquenessScope extends IScope {
    items: any[];
    property: string;
}
export class UniquenessValidator implements IDirective<UniquenessScope> {
    require = 'ngModel';
    scope = {
        items: '=',
        property: '@property'
    };

    link(scope: UniquenessScope, element: IAugmentedJQuery, attributes: IAttributes, ngModel: INgModelController) {
        const validate = (value: any): void => {
            const matches = !scope.items ? [] :
                scope.items.map(i => i[scope.property]).filter(i => i === value);
            ngModel.$setValidity('uniqueness', matches.length < 2);
        };

        scope.$watch('items', function (items) {
            validate(ngModel.$viewValue);
        }, true);
    }

    static factory(): IDirectiveFactory {
        return () => new UniquenessValidator();
    }
}

interface CkEditorScope extends IScope {
    enableClozeTest: boolean;
}
export class CkEditor implements IDirective<CkEditorScope> {
    require = 'ngModel';
    scope = {
        enableClozeTest: '=?'
    };

    link(scope: CkEditorScope, element: IAugmentedJQuery, attributes: IAttributes, ngModel: INgModelController) {
        // We need to disable some paste tools when cloze test editing is ongoing. There's a risk that
        // dysfunctional formatting gets pasted which can break the cloze test markup.
        const removals = scope.enableClozeTest ? 'Underline,Paste,PasteFromWord' : 'Underline,Cloze';
        const ck = CKEDITOR.replace(<HTMLTextAreaElement>element[0], { removeButtons: removals });

        let modelValue;
        ck.on('instanceReady', () => {
            ck.setData(modelValue);
        });

        const updateModel = () =>
            _.defer(() => scope.$apply(() => ngModel.$setViewValue(ck.getData())));


        ck.on('change', _.debounce(updateModel, 100)); // This can bring down the UI if not scaled down
        ck.on('dataReady', updateModel);
        ck.on('key', _.debounce(updateModel, 100));
        ck.on('mode', updateModel); // Editing mode change


        ngModel.$render = () => {
            modelValue = ngModel.$modelValue;
            ck.setData(ngModel.$viewValue);
        };

    }

    static factory(): IDirectiveFactory {
        return () => new CkEditor();
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

interface ClozeTestScope extends IScope {
    results: Object;
    content: any;
    editable: boolean;
}
export class ClozeTest implements IDirective<ClozeTestScope> {
    restrict = 'E';
    scope = {
        results: '=',
        content: '=',
        editable: '=?'
    };

    constructor(private $compile: angular.ICompileService) { }

    link(scope: ClozeTestScope, element: IAugmentedJQuery, attributes: IAttributes) {
        const editable = _.isUndefined(scope.editable) || scope.editable; // defaults to true
        const replacement = angular.element(scope.content);
        const inputs = replacement.find('input');
        for (let i = 0; i < inputs.length; ++i) {
            const input = inputs[i];
            const id = input.attributes['id'].value;
            const answer = scope.results ? scope.results[input.id] : null;
            if (answer) {
                input.setAttribute('size', answer.length);
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
        const directive = (
            $compile: angular.ICompileService,
        ) => new ClozeTest($compile);
        directive.$inject = ['$compile'];
        return directive;
    }
}

export class UiBlur implements IDirective {
    restrict = 'A';

    constructor(private $parse: angular.IParseService) { }

    link(scope, element, attributes) {
        const expr: angular.ICompiledExpression = this.$parse(attributes.uiBlur);
        element.bind('blur', () => expr(scope));
    }

    static factory(): IDirectiveFactory {
        const directive = (
            $parse: angular.IParseService,
        ) => new UiBlur($parse);
        directive.$inject = ['$parse'];
        return directive;
    }
}

export class UiChange implements IDirective {
    restrict = 'A';

    constructor(private $parse: angular.IParseService) { }

    link(scope, element, attributes) {
        const expr: angular.ICompiledExpression = this.$parse(attributes.uiChange);
        element.bind('change', () => expr(scope));
    }

    static factory(): IDirectiveFactory {
        const directive = (
            $parse: angular.IParseService,
        ) => new UiChange($parse);
        directive.$inject = ['$parse'];
        return directive;
    }
}

export class FileModel implements IDirective {
    restrict = 'A';

    constructor(private $parse: angular.IParseService) { }

    link(scope, element, attributes) {
        const modelSetter = this.$parse(attributes.fileModel).assign;
        element.bind('change', () =>
            scope.$apply(() => modelSetter(scope.$parent, element[0].files[0]))
        );
    }

    static factory(): IDirectiveFactory {
        const directive = (
            $parse: angular.IParseService,
        ) => new FileModel($parse);
        directive.$inject = ['$parse'];
        return directive;
    }
}

export class FileSelector implements IDirective {
    restrict = 'A';
    require = 'ngModel';

    constructor(private $parse: angular.IParseService) { }

    link(scope, element, attributes, ngModel) {
        element.bind('change', () => ngModel.$setViewValue(element[0].files[0]));
    }

    static factory(): IDirectiveFactory {
        const directive = (
            $parse: angular.IParseService,
        ) => new FileSelector($parse);
        directive.$inject = ['$parse'];
        return directive;
    }
}

export class MathJaxLoader implements IDirective {
    restrict = 'A';

    link(scope, element, attributes) {
        scope.$watch(attributes.ngModel, () => MathJax.Hub.Queue(['Typeset', MathJax.Hub, element.get(0)]));
    }

    static factory(): IDirectiveFactory {
        return () => new MathJaxLoader();
    }
}

export class FocusOn implements IDirective {
    link(scope, element, attributes) {
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
    link(scope, element, attrs, ngModel) {
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
    template =
        `<span class="pointer" ng-click="sort()">{{ text | translate }}&nbsp;
            <i class="fa" ng-class="getSortClass()"></i>
        </span>`;
    scope = {
        predicate: '=',
        by: '@by',
        text: '@text',
        reverse: '=',
        onSort: '&?'
    };

    constructor(private $timeout: angular.ITimeoutService) { }

    link(scope: SortScope, element, attributes) {
        scope.sort = () => {
            scope.predicate = scope.by;
            scope.reverse = !scope.reverse;
            if (scope.onSort) {
                this.$timeout(scope.onSort);
            }
        };
        scope.getSortClass = () =>
            scope.predicate === scope.by ?
                (scope.reverse ? 'fa-caret-down' : 'fa-caret-up') : 'fa-sort';
    }

    static factory(): IDirectiveFactory {
        const directive = (
            $timeout: angular.ITimeoutService,
        ) => new Sort($timeout);
        directive.$inject = ['$timeout'];
        return directive;
    }
}

// TODO: turn into a component
interface TeacherListScope extends IScope {
    exam: {
        examOwners: { firstName: string, lastName: string }[],
        examInspections: { firstName: string, lastName: string }[]
    };
    useParent: boolean;
}
export class TeacherList implements IDirective<TeacherListScope> {
    restrict = 'E';
    replace = false;
    transclude = false;
    scope = {
        exam: '=exam',
        useParent: '<?'
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

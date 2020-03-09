/*
 * Copyright (c) 2018 Exam Consortium
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
// These must be imported first, in this order. Otherwise the whole app breaks.
import 'core-js/stable';
import 'reflect-metadata';
import 'regenerator-runtime/runtime';
import 'zone.js';

import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeFi from '@angular/common/locales/fi';
import localeSv from '@angular/common/locales/sv';
import { NgZone } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { Trace, UIRouter, UrlService } from '@uirouter/core';

import { AppModule } from './app.module';
import { ajsApp } from './app.module.ajs';

registerLocaleData(localeSv);
registerLocaleData(localeFi);
registerLocaleData(localeEn);

// Using AngularJS config block, call `deferIntercept()`.
// This tells UI-Router to delay the initial URL sync (until all bootstrapping is complete)
// eslint-disable-next-line angular/module-getter
ajsApp.config(['$urlServiceProvider', ($urlService: UrlService) => $urlService.deferIntercept()]);
// Enable state transition tracing for time being
const traceRunBlock = [
    '$trace',
    ($trace: Trace) => {
        $trace.enable(1);
    },
];
ajsApp.run(traceRunBlock);

// Manually bootstrap the Angular app
platformBrowserDynamic()
    .bootstrapModule(AppModule)
    .then(platformRef => {
        // Initialize the Angular Module
        // get() the UIRouter instance from DI to initialize the router
        const urlService: UrlService = platformRef.injector.get(UIRouter).urlService;

        // Instruct UIRouter to listen to URL changes
        function startUIRouter() {
            urlService.listen();
            urlService.sync();
        }

        // eslint-disable-next-line angular/module-getter
        platformRef.injector.get<NgZone>(NgZone).run(startUIRouter);
    });

// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';
import { examinationInterceptor } from './examination.interceptor';

export const interceptors = [authInterceptor, examinationInterceptor, errorInterceptor];

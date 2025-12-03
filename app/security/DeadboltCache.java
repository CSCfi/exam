// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package security;

import be.objectify.deadbolt.java.DeadboltHandler;
import be.objectify.deadbolt.java.cache.HandlerCache;
import java.util.HashMap;
import java.util.Map;
import javax.inject.Inject;
import javax.inject.Singleton;

@Singleton
class DeadboltCache implements HandlerCache {

    private final AuthorizationHandler defaultHandler;

    private final Map<String, DeadboltHandler> handlers = new HashMap<>();

    @Inject
    DeadboltCache(final AuthorizationHandler handler) {
        this.defaultHandler = handler;
        handlers.put(defaultHandler.handlerName(), defaultHandler);
    }

    @Override
    public DeadboltHandler apply(String key) {
        return handlers.get(key);
    }

    @Override
    public DeadboltHandler get() {
        return defaultHandler;
    }
}

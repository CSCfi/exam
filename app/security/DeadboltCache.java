package security;

import be.objectify.deadbolt.java.DeadboltHandler;
import be.objectify.deadbolt.java.cache.HandlerCache;

import javax.inject.Inject;
import javax.inject.Singleton;
import java.util.HashMap;
import java.util.Map;

@Singleton
public class DeadboltCache implements HandlerCache {

    private final AuthorizationHandler defaultHandler;

    private final Map<String, DeadboltHandler> handlers = new HashMap<>();

    @Inject
    public DeadboltCache(final AuthorizationHandler handler) {
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

package security;

import be.objectify.deadbolt.java.ConfigKeys;
import be.objectify.deadbolt.java.DeadboltHandler;
import be.objectify.deadbolt.java.cache.HandlerCache;

import javax.inject.Singleton;
import java.util.HashMap;
import java.util.Map;

@Singleton
public class DeadboltCache implements HandlerCache {

    private final DeadboltHandler defaultHandler = new AuthorizationHandler();

    private final Map<String, DeadboltHandler> handlers = new HashMap<>();

    public DeadboltCache() {
        handlers.put(ConfigKeys.DEFAULT_HANDLER_KEY, defaultHandler);
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

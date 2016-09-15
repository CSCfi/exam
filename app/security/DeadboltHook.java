package security;

import be.objectify.deadbolt.java.cache.HandlerCache;
import play.api.Configuration;
import play.api.Environment;
import play.api.inject.Binding;
import play.api.inject.Module;
import scala.collection.Seq;


public class DeadboltHook extends Module {

    @Override
    public Seq<Binding<?>> bindings(Environment environment, Configuration configuration) {
        return seq(
                bind(AuthorizationHandler.class).toSelf().eagerly(),
                bind(HandlerCache.class).to(DeadboltCache.class).eagerly()
        );
    }

}

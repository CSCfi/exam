package security;

import be.objectify.deadbolt.java.DeadboltAnalyzer;
import be.objectify.deadbolt.java.DeadboltHandler;
import be.objectify.deadbolt.java.DynamicResourceHandler;
import play.mvc.Http;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

class CombinedRoleAndPermissionHandler implements DynamicResourceHandler {

    @Override
    public CompletionStage<Boolean> isAllowed(String name, Optional<String> meta, DeadboltHandler deadboltHandler, Http.Context ctx) {
        if (meta.isPresent() && meta.get().matches("pattern=.+,role=.+,anyMatch=(true|false)")) {
            String[] config = meta.get().split(",");
            String pattern = config[0].substring(config[0].indexOf('=') + 1);
            String[] role = {config[1].substring(config[1].indexOf('=') + 1)};
            Boolean anyMatch = Boolean.valueOf(config[2].substring(config[2].indexOf('=') + 1));
            return deadboltHandler.getSubject(ctx).thenApplyAsync(s -> {
                DeadboltAnalyzer da = new DeadboltAnalyzer();
                if (anyMatch) {
                    return da.checkPatternEquality(s, Optional.of(pattern)) ||
                            da.checkRole(s, role);
                } else {
                    return da.checkPatternEquality(s, Optional.of(pattern)) &&
                            da.checkRole(s, role);
                }
            });
        } else {
            return CompletableFuture.completedFuture(false);
        }
    }

    @Override
    public CompletionStage<Boolean> checkPermission(String permissionValue,
                                                    Optional<String> meta,
                                                    DeadboltHandler deadboltHandler,
                                                    Http.Context ctx) {
        return CompletableFuture.completedFuture(false);
    }
}

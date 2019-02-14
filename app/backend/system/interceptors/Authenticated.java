package backend.system.interceptors;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import play.mvc.With;

import backend.controllers.base.BaseController;

@With(AuthenticatedAction.class)
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface Authenticated {
    String cacheKey() default BaseController.SITNET_CACHE_KEY;
    String tokenHeader() default BaseController.SITNET_TOKEN_HEADER_KEY;
}

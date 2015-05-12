package controllers;

import exceptions.MalformedDataException;
import play.data.Form;
import play.libs.F;
import play.mvc.Controller;
import play.mvc.Result;

public class SitnetController extends Controller {

    public static final String SITNET_TOKEN_HEADER_KEY = "x-sitnet-authentication";
    public static final String SITNET_CACHE_KEY = "user.session.";
    public static final int SITNET_TIMEOUT_MINUTES = 30;

    public static <T> T bindForm(final Class<T> clazz) throws MalformedDataException {
        final Form<T> form = Form.form(clazz);
        if (form.hasErrors()) {
            throw new MalformedDataException(form.errorsAsJson().asText());
        }
        return form.bindFromRequest().get();
    }

    protected  static F.Promise<Result> wrapAsPromise(final Result result) {
        return F.Promise.promise(new F.Function0<Result>() {
            @Override
            public Result apply() throws Throwable {
                return result;
            }
        });
    }
}

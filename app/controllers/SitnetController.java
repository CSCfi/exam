package controllers;

import play.data.Form;
import play.mvc.Controller;
import Exceptions.MalformedDataException;

public class SitnetController extends Controller {

    public static final String SITNET_TOKEN_HEADER_KEY = "x-sitnet-authentication";
    public static final String SITNET_CACHE_KEY = "user.session.";
    public static final int SITNET_TIMEOUT_MINUTES = 30;

    static <T> T bindForm(final Class<T> clazz) throws MalformedDataException {
        final Form<T> form = Form.form(clazz);
        if (form.hasErrors()) {
            throw new MalformedDataException(form.errorsAsJson().asText());
        }
        return form.bindFromRequest().get();
    }
}

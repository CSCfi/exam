package controllers;

import play.Environment;
import play.mvc.Controller;
import play.mvc.Result;
import views.html.index;

import javax.inject.Inject;

public class Index extends Controller {

    @Inject
    protected Environment environment;

    public Result index() {
        return ok(index.render(environment.isProd()));
    }
}

package controllers;

import play.Environment;
import play.mvc.Controller;
import play.mvc.Result;
import views.html.index;

import javax.inject.Inject;

public class Index extends Controller {

    @Inject
    protected Environment environment;

    @Inject
    WebJarAssets webJarAssets;

    public Result index() {
        return ok(index.render(webJarAssets, environment.isProd()));
    }
}

package controllers;

import play.mvc.Controller;
import play.mvc.Result;
import views.html.index;

public class Index extends Controller {

    public Result index() {
        return ok(index.render());
    }
}

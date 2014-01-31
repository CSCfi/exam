package controllers;

import play.mvc.Controller;
import play.mvc.Result;

import java.util.UUID;

public class Login extends Controller {


    public static Result login() {
        return ok(UUID.randomUUID().toString());
    }

    public static Result logout(String token) {
        return ok("success");
    }

    //todo: add method to get user data with proper token
    public static Result loggedin() {
        return ok("0");
    }
    
    //todo: add method to get token with proper password and username(? should we use oid or some else) combination

    //todo: add methods for list user from different groups

}

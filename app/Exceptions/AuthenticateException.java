package Exceptions;

public class AuthenticateException extends SitnetException {
    public AuthenticateException() {
    }

    public AuthenticateException(String message) {
        super(message);
    }
}
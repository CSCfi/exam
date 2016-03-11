package models;

import models.base.GeneratedIdentityModel;

import javax.persistence.Entity;


@Entity
public class MailAddress extends GeneratedIdentityModel {

    private String street;

    private String zip;

    private String city;

    public String getStreet() {
        return street;
    }

    public void setStreet(String street) {
        this.street = street;
    }

    public String getZip() {
        return zip;
    }

    public void setZip(String zip) {
        this.zip = zip;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    @Override
    public String toString() {
        return street + ", " + zip + "  " + city;
    }
}

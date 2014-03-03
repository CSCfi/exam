package models;

import java.util.List;

import javax.persistence.Entity;

// TODO: tätä täytyy miettiä tarkemmin miten Organisaatiot kannattaa maalintaa

/* 
 * Dummy Organisaatio
 * 
 * Tämä rakenne mahdolistaa heirarkisen puurakenteen
 * 
 * 								Oulun Yliopisto
 * 								/				\
 * 		Luonnontieteellinen tiedetkunta			Teknillinen tiedekunta
 * 			/					\					/					\
 * Biologian laitos		Maantieteen laitos		Konetekniikka		Tuotantotalous
 */
@Entity
public class Organisation extends SitnetModel {

	private String name;
	
	//Nimilyhenne   OAMK
	private String nameAbbreviation;
	
	private String code;

	// VAT identification number
	// Y-tunnus
	private String vatIdNumber;
	
	
	// Organisaatiolla on N kappaletta lapsia, joilla voi olla omia lapsia
	private List<Organisation> organisations;
	
	private Organisation parent;
	
	// Ylin organisaatio?
	private boolean root;

	public Organisation(User creator) {
		super(creator);
		// TODO Auto-generated constructor stub
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getNameAbbreviation() {
		return nameAbbreviation;
	}

	public void setNameAbbreviation(String nameAbbreviation) {
		this.nameAbbreviation = nameAbbreviation;
	}

	public String getCode() {
		return code;
	}

	public void setCode(String code) {
		this.code = code;
	}

	public String getVatIdNumber() {
		return vatIdNumber;
	}

	public void setVatIdNumber(String vatIdNumber) {
		this.vatIdNumber = vatIdNumber;
	}

	public List<Organisation> getOrganisations() {
		return organisations;
	}

	public void setOrganisations(List<Organisation> organisations) {
		this.organisations = organisations;
	}

	public Organisation getParent() {
		return parent;
	}

	public void setParent(Organisation parent) {
		this.parent = parent;
	}

	public boolean isRoot() {
		return root;
	}

	public void setRoot(boolean root) {
		this.root = root;
	}

    @Override
    public String toString() {
        return "Organisation{" +
                "name='" + name + '\'' +
                ", nameAbbreviation='" + nameAbbreviation + '\'' +
                ", code='" + code + '\'' +
                ", vatIdNumber='" + vatIdNumber + '\'' +
                ", organisations=" + organisations +
                ", parent=" + parent +
                ", root=" + root +
                '}';
    }
}

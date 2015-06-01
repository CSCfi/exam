package models;

import javax.persistence.*;
import java.util.List;

@Entity
public class Organisation extends GeneratedIdentityModel {

    private String code;
	
	private String name;

	private String nameAbbreviation;


    @ManyToMany(cascade = CascadeType.ALL)
    @JoinTable(name="organisation_organisation",
    	      joinColumns=@JoinColumn(name="parent_id"),
    	      inverseJoinColumns=@JoinColumn(name="child_id"))
	private List<Organisation> organisations;
		
    private String courseUnitInfoUrl;

    private String recordsWhitelistIp;

	private String vatIdNumber;

    public String getCode() {
		return code;
	}

    public String getCourseUnitInfoUrl() {
        return courseUnitInfoUrl;
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

	public List<Organisation> getOrganisations() {
		return organisations;
	}

	public String getRecordsWhitelistIp() {
        return recordsWhitelistIp;
    }

	public String getVatIdNumber() {
		return vatIdNumber;
	}

	public void setCode(String code) {
		this.code = code;
	}

	public void setCourseUnitInfoUrl(String courseUnitInfoUrl) {
        this.courseUnitInfoUrl = courseUnitInfoUrl;
    }


	public void setNameAbbreviation(String nameAbbreviation) {
		this.nameAbbreviation = nameAbbreviation;
	}

	public void setOrganisations(List<Organisation> organisations) {
		this.organisations = organisations;
	}

	public void setRecordsWhitelistIp(String recordsWhitelistIp) {
        this.recordsWhitelistIp = recordsWhitelistIp;
    }

	public void setVatIdNumber(String vatIdNumber) {
		this.vatIdNumber = vatIdNumber;
	}

	@Override
    public String toString() {
        return "Organisation{" +
                "name='" + name + '\'' +
                ", nameAbbreviation='" + nameAbbreviation + '\'' +
                ", code='" + code + '\'' +
                ", vatIdNumber='" + vatIdNumber + '\'' +
                ", organisations=" + organisations +
                '}';
    }
}

package models;


import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;

/*
 * Opinnon tyyppi
 * http://tietomalli.csc.fi/Opinnon%20tyyppi.html
 */
public class CourseType {

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    private Long id;

	private String code;
	
	private String name;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getCode() {
		return code;
	}

	public void setCode(String code) {
		this.code = code;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	
}

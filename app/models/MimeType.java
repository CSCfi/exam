package models;

import javax.persistence.*;

@Entity
public class MimeType {

	@Transient
	public static final String COMMENT ="comment";
	@Transient
	public static final String IMAGE ="image";
	@Transient
	public static final String TEXT ="text";

	@Id
	@GeneratedValue(strategy=GenerationType.AUTO)
	private Long id;	
	
	private String type;

	public String getType() {
		return type;
	}

	public void setType(String type) {
		this.type = type;
	}
	
	
}

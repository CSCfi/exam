package models;

import java.sql.Timestamp;

public class UserSession {

	
	private Long uid;
	private String email;
	private Timestamp timestamp;
	private String token;
	
	public UserSession() {
		
	}

	public UserSession(Long uid, String email, Timestamp timestamp, String token) {
		super();
		this.uid = uid;
		this.email = email;
		this.timestamp = timestamp;
		this.token = token;
	}

	public Long getUid() {
		return uid;
	}

	public void setUid(Long uid) {
		this.uid = uid;
	}

	public Timestamp getTimestamp() {
		return timestamp;
	}

	public void setTimestamp(Timestamp timestamp) {
		this.timestamp = timestamp;
	}

	public String getToken() {
		return token;
	}

	public void setToken(String token) {
		this.token = token;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	@Override
	public String toString() {
		return "UserSession [uid=" + uid + ", email=" + email + ", timestamp="
				+ timestamp + ", token=" + token + "]";
	}

}

package models;

import java.util.List;

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
public class Organisation {

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
	
	
	
}

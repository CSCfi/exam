// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation

import org.jsoup.Jsoup
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec
import validation.core.HtmlSafelist

// The safelist is the last thing standing between hand-written markup — source editing mode in
// CKEditor accepts anything — and what every reader of an exam renders. Media that pulls in remote
// content is the concern: in an exam room with no network restrictions it is a way to the open web.
class HtmlSafelistSpec extends AnyWordSpec with Matchers:

  private def clean(html: String): String = Jsoup.clean(html, HtmlSafelist.SAFELIST)

  "The shared HTML safelist" should {

    "drop elements that render remote content" in {
      val media = Seq(
        """<img src="https://example.test/i.png" />""",
        """<video src="https://example.test/v.mp4"></video>""",
        """<audio src="https://example.test/a.mp3"></audio>""",
        """<iframe src="https://example.test"></iframe>""",
        """<object data="https://example.test"></object>""",
        """<embed src="https://example.test" />"""
      )
      media.foreach: element =>
        withClue(s"$element was kept: ")(clean(s"<p>text</p>$element") mustBe "<p>text</p>")
    }

    "drop scripts and event handlers" in {
      clean("""<p onclick="alert(1)">text</p>""") mustBe "<p>text</p>"
      clean("""<script>alert(1)</script><p>text</p>""") mustBe "<p>text</p>"
    }

    "keep the markup the editors actually produce" in {
      val kept = clean(
        """<p>a <strong>b</strong> <em>c</em></p>""" +
          """<p><a href="https://example.test" target="_blank">link</a></p>""" +
          """<span cloze="true" case-sensitive="false">[answer]</span>""" +
          """<math-field data-expression="x^2">x^2</math-field>""" +
          """<table><tbody><tr><td>cell</td></tr></tbody></table>"""
      )
      kept must include("<strong>b</strong>")
      kept must include("""href="https://example.test"""")
      kept must include("""target="_blank"""")
      kept must include("""cloze="true"""")
      kept must include("<math-field")
      kept must include("<td>cell</td>")
    }

    "keep list styles" in {
      clean("""<ul style="list-style-type:square;"><li>a</li></ul>""") must include(
        """<ul style="list-style-type:square;">"""
      )
      clean("""<ol style="list-style-type:lower-roman;"><li>a</li></ol>""") must include(
        """<ol style="list-style-type:lower-roman;">"""
      )
    }
  }

class PreviewExam {

    async leaveInstructionsPage() {
        expect(browser.getCurrentUrl()).toMatch(/.+\/preview/);
        await element(by.className('blue_button')).click();
    }

}

module.exports = PreviewExam;
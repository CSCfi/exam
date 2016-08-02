var PreviewExam = function () {


    this.leaveInstructionsPage = function () {
        expect(browser.getCurrentUrl()).toMatch(/.+\/preview/);


        element(by.className('blue_button')).click();
    };
    
    
};
module.exports = PreviewExam;
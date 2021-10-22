export default async function(octokit) {
    console.log("Start Grading");
    /*

    Select CSV (Hold State) (Optional, will set select repos)
        Pick file from data folder
    Select Grader (Hold State) (Required)
        Select grader repo, then clone it locally
    Select Repos (Hold State) (Required, will unset CSV)
        Select repos from downloaded
    Start Grading (Disabled if (!Repos || !Grader))
        Runs tests
        combines data with grading CSV, if present
        print tabulated data of all students
        options:
            Export CSV
            Export Feedback
            Push feedback to student repos in issue

    */
}
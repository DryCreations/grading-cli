

export default async function(octokit) {
    console.log("Start Grading");

    let csv;
    let grader;
    let repos;

    let options = {
        'csv': {
            disabled: false,
            name: 'Select CSV',
            action: async () => {
                console.log('Select CSV');
            }
        },
        'grader': {
            disabled: false,
            name: 'Select Grader',
            action: async () => {
                console.log('Select Grader');
            }
        },
        'repos': {
            disabled: false,
            name: 'Select repos',
            action: async () => {
                console.log('Select repos');
            }
        },
        'start': {
            disabled: false,
            name: 'Start Grading',
            action: async () => {
                console.log('Start Grading');
            }
        },
    }
    
    const choice = await Select.prompt({
        message: "What would you like to do?",
        options: Object.entries(options).map(([value, {name, disabled}]) => {
            return {value, name, disabled}
        }),
    });

    await options[choice].action();

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
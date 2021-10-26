
import { Select } from "https://deno.land/x/cliffy/prompt/select.ts";
import { Input } from "https://deno.land/x/cliffy/prompt/input.ts";
import { get_repos } from "./git.js";

let cache = {};

export default async function(octokit) {
    console.log("Start Grading");

    let csv;
    let csv_file;
    let grader;
    let repos;
    let exit_flag = false;

    do {
        let options = {
            'csv': {
                disabled: false,
                name: `Select CSV ${csv_file ? csv_file : ''}`,
                action: async () => {
                    csv_file = await selectCSV('./data/grade_exports')
                    csv = await readCSV(csv_file);
                    
                    repos = csv.map(i => {
                        return i.student_repository_url;
                    })
                }
            },
            'grader': {
                disabled: false,
                name: `Select Grader ${grader ? grader : ''}`,
                action: async () => {
                    grader = await get_grader_repo(octokit);
                }
            },
            'repos': {
                disabled: false,
                name: `Select repos ${repos ? '*SET*' : ''}`,
                action: async () => {
                    csv = undefined;
                    repos = [];
                }
            },
            'start': {
                disabled: (!repos || !grader),
                name: 'Start Grading',
                action: async () => {
                    await start_grading(octokit, csv, repos, grader);
                }
            },
            'exit': {
                disabled: false,
                name: 'Exit',
                action: async () => {
                    exit_flag = true;
                }
            }
        }
        
        const choice = await Select.prompt({
            message: "What would you like to do?",
            options: Object.entries(options).map(([value, {name, disabled}]) => {
                return {value, name, disabled}
            }),
        });
    
        await options[choice].action();
    } while (!exit_flag)

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

async function selectCSV(dir) {
    let files = [];

    for await (const dirEntry of Deno.readDir(dir)) {
        if (dirEntry.isFile) {
            files.push({
                name: dirEntry.name,
                value: dir + '/' + dirEntry.name
            })
        }
    }

    return Select.prompt({
        message: 'Choose a csv file from ' + dir,
        options: files
    })

}

async function readCSV(file) {
    const text = await Deno.readTextFile(file);

    let [headers, ...body] = text.split('\n');

    headers = headers.split(',').map(i => {
        return i.trim().replace(/^"|"$/g, '');
    })

    body = body.map(i => {
        return i.split(',').map(j => {
            return j.trim().replace(/^"|"$/g, '');
        })
    }).filter(i => {
        return i.length == headers.length;
    })

    return body.map(i => {
        return Object.fromEntries(i.map((j, idx) => {
            return [headers[idx], j];
        }))
    })
}


async function get_grader_repo(octokit) {
    let is_org = await Select.prompt({
        message: "Where is the repo?",
        options: [
            {value: 'org', name: 'Organization'},
            {value: 'user', name: 'User'}
        ],
    }) == 'org';

    const name = await Input.prompt(`What is the ${is_org ? 'organization' : 'user'} name?`);

    let fetch_repos = true;
    let suggestions;

    if (cache[name]?.length > 0) {
        fetch_repos = await Toggle.prompt("I have recently fetched these repos. Should I fetch them again?");
        suggestions = cache[name].map(v => {
            return v.name;
        })
    }

    const reg = await Input.prompt({
        message: `What would you like to search for?`,
        suggestions,
        list: suggestions !== undefined,
    });

    let repos = cache[name];

    if (fetch_repos) {
        repos = await get_repos(octokit, is_org, name, reg);
    }

    const {token} = await octokit.auth({ type: "get" });

    let options = repos.map( (i,idx) => {
        return {
            name: i.full_name,
            value: "" + idx
        }
    })
    
    let repo = repos[await Select.prompt({
        message: "Select the grader repository: ",
        options
    })]

    let clone_url = repo.clone_url.replace('https://', 'https://' + token + '@');
    let clone_dir = `./tmp/graders/${repo.full_name}`;

    const req = { name: "run" };
    const perm = await Deno.permissions.request(req);

    if (perm.state == "granted") { 

        const rm = Deno.run({
            cmd: ["rm", "-rf", clone_dir]
        })
        
        await rm.status();
        
        const clone = Deno.run({
            cmd: ["git", "clone", clone_url, clone_dir]
        })
        
        await clone.status();

        await Deno.permissions.revoke(req)
    } else {
        console.log('failed to download -- please grant permissions to run scripts')
        return undefined;
    }

    return clone_dir;

}

async function start_grading(octokit, csv, repos, grader) {
    console.log("start grading");
}
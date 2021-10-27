
import { Select } from "https://deno.land/x/cliffy/prompt/select.ts";
import { Input } from "https://deno.land/x/cliffy/prompt/input.ts";
import { Table } from "https://deno.land/x/cliffy/table/mod.ts";
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
            // 'repos': {
            //     disabled: false,
            //     name: `Select repos ${repos ? '*SET*' : ''}`,
            //     action: async () => {
            //         csv = undefined;
            //         repos = [];
            //     }
            // },
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
    let grading_info = JSON.parse(await Deno.readTextFile(`${grader}/grading.json`));
    let test_cases = grading_info.tests;
    const req = { name: "run" };
    const perm = await Deno.permissions.request(req);
    const {token} = await octokit.auth({ type: "get" });
    if (perm.state == "granted") { 
        let dir = `${grader}/${grading_info.grader}`;
        for (let s of grading_info.setup) {    
            const c = Deno.run({
                cwd: dir,
                cmd: ["bash", "-c", s]
            })
    
            await c.status();
        }
        let grader_results = await Promise.all(test_cases.map(test => {
            return run_test(dir, test);
        }));
        
        let dirs = await Promise.all(repos.map(async repo => {
            let reg = /(?<=https:\/\/github\.com\/).*/;
            let [repo_name] = repo.match(reg);
            let dir_name = `./tmp/repos/${repo_name}`;
           
            const rm = Deno.run({
                cmd: ["rm", "-rf", dir_name]
            })

            await rm.status();
            
            const clone = Deno.run({
                cmd: ["git", "clone", repo.replace('https://', 'https://' + token + '@'), dir_name]
            })
            
            await clone.status();

            return dir_name;
        }))

        let test_results = await Promise.all(dirs.map(d => {
            return run_tests(d, grading_info);
        }));

        let scores = await Promise.all(test_results.map(result => score_tests(result, grader_results, grading_info)));

        let max = grading_info.tests.reduce((prev, curr)=>{return curr.points + prev},0);

        let headers = ["repo_url", "score", "max"];

        let rows = [];

        repos.forEach((repo, idx) => {
            rows.push([repo, scores[idx].reduce((a,b) => a + b, 0), max])
        });

        if (csv) {
            rows.forEach(row => {
                let e = csv.find(el => row[0] == el.student_repository_url);
                row.unshift(e.roster_identifier)
                row.push(e.points_awarded)
            })
            headers.unshift('name');
            headers.push('autograder')
        }

        new Table()
            .header(headers)
            .body(rows)
            .render();

        

    } else {
        console.log('failed to grade assignment -- please allow run permissions')
    }
}

async function score_tests(student, grader, grading_info) {
    return Promise.all(grading_info.tests.map((test, idx) => {
        let score;
        switch (test.comparison) {
            case "lev":
                score = 0;
                break;
            case "exact":
            default:
                score = student[idx].stdout == grader[idx].stdout ? 1 : 0;
                break;
        }

        return score * test.points;
    }));
}

async function run_tests(dir, grading_info) {
    for (let s of grading_info.setup) {    
        const c = Deno.run({
            cwd: dir,
            cmd: ["bash", "-c", s]
        })

        await c.status();
    }

    return Promise.all(grading_info.tests.map(test => {
        return run_test(dir, test);
    }));

}

async function run_test(dir, test) {
    const r = Deno.run({
        cwd: dir,
        cmd: ["bash", "-c", test.run],
        stdout: 'piped',
        stdin: 'piped',
        stderr: 'piped'
    })

    await r.stdin.write(new TextEncoder().encode(test.input));
    await r.stdin.close();

    await r.status();

    let decoder = new TextDecoder();

    return {
        stdin: test.input,
        stdout: decoder.decode(await r.output()),
        stderr: decoder.decode(await r.stderrOutput())
    }
}
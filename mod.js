import auth_flow from "./modules/auth.js";
import grade_flow from "./modules/grade.js";

import { Select } from "https://deno.land/x/cliffy/prompt/select.ts";
import { config } from "https://deno.land/x/dotenv/mod.ts";
import { Input } from "https://deno.land/x/cliffy/prompt/input.ts";
import { parseFlags } from "https://deno.land/x/cliffy/flags/mod.ts";

import {exists} from "https://deno.land/std/fs/mod.ts"

import { delete_repos, download_repos } from './modules/git.js';

const read_perm = Deno.permissions.request({ name: "read", path: "." })
const github_perm = Deno.permissions.request({name: "net", host: 'github.com'});
const github_api_perm = Deno.permissions.request({name: "net", host: 'api.github.com'});
const env_perm = Deno.permissions.request({name: "env"})

let perms_granted = await Promise.all([read_perm, github_perm,github_api_perm, env_perm]);

if (perms_granted.some((v => v.state == "denied"))) {
    console.log('please grant proper permissions for this app to work.')
    Deno.exit();
}

config({ export: true });
let { flags } = parseFlags(Deno.args);
let clientId = Deno.env.get('GITHUB_CLIENT_ID');
clientId = clientId || flags.client

if (!clientId) {
    console.log('ENVIRONMENT VARIABLE `GITHUB_CLIENT_ID` MISSING');
    clientId = await Input.prompt('What is the client ID for your github oauth app?')
}

let octokit;

while(true) {

    let repos_dir_exists = await exists("./tmp/repos/");

    let options = {
        'download': {
            disabled: octokit === undefined,
            name: 'Download Repositories',
            action: async () => {
                await download_repos(octokit);
            }
        },
        'delete': {
            disabled: !repos_dir_exists,
            name: 'Delete Repositories',
            action: async () => {
                await delete_repos();
            }
        },
        'grade': {
            disabled: octokit === undefined,
            name: 'Grade Assignment',
            action: async () => {
                await grade_flow(octokit);
            }
        },
        'archive': {
            disabled: octokit === undefined,
            name: 'Archive',
            action: async () => {
                console.log('archive classroom');
            }
        },
        'auth': {
            disabled: false,
            name: 'Authenticate',
            action: async () => {
                octokit = await auth_flow(clientId);
            }
        },
        'exit': {
            disabled: false,
            name: 'Exit',
            action: async () => {
                Deno.exit();
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
}

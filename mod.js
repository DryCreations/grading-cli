import AuthFlow from "./modules/auth.js";

import { Select } from "https://deno.land/x/cliffy/prompt/select.ts";
import { config } from "https://deno.land/x/dotenv/mod.ts";

import { download_repos } from './modules/git.js';

const read_perm = Deno.permissions.request({ name: "read", path: "." })
const github_perm = Deno.permissions.request({name: "net", host: 'github.com'});
const github_api_perm = Deno.permissions.request({name: "net", host: 'api.github.com'});
const env_perm = Deno.permissions.request({name: "env"})

let perms_granted = await Promise.all([read_perm, github_perm,github_api_perm, env_perm]);

if (perms_granted.some((v => v.state == "denied"))) {
    console.log('please grant proper permissions for this app to work.')
    Deno.exit();
}

config({ safe: true, export: true });
let octokit;

while(true) {
    let options = {
        'download': {
            disabled: octokit === undefined,
            name: 'Download Repositories',
            action: async () => {
                await download_repos(octokit);
            }
        },
        'delete': {
            disabled: octokit === undefined,
            name: 'Delete Repositories',
            action: async () => {
                console.log('start grading')
            }
        },
        'auth': {
            disabled: false,
            name: 'Authenticate',
            action: async () => {
                octokit = await AuthFlow();
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

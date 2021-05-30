import AuthFlow from "./modules/auth.js";

import { Select } from "https://deno.land/x/cliffy/prompt/select.ts";
import { config } from "https://deno.land/x/dotenv/mod.ts";

import { download_repos } from './modules/git.js';

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

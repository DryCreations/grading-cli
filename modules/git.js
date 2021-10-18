import { Select } from "https://deno.land/x/cliffy/prompt/select.ts";
import { Input } from "https://deno.land/x/cliffy/prompt/input.ts";
import { Toggle } from "https://deno.land/x/cliffy/prompt/toggle.ts";

let cache = {};

export async function download_repos(octokit) {
    let is_org = await Select.prompt({
        message: "Where are these repos?",
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

    const req = { name: "run" };
    const perm = await Deno.permissions.request(req);

    const {token} = await octokit.auth({ type: "get" });

    if (perm.state == "granted") { 
        await Promise.all(repos.map(async (r) => {
            let dir_name = `./tmp/${r.full_name}`;

            const rm = Deno.run({
                cmd: ["rm", "-rf", dir_name]
            })
            
            await rm.status();
            
            const clone = Deno.run({
                cmd: ["git", "clone", r.clone_url.replace('https://', 'https://' + token + '@'), dir_name]
            })
            
            return clone.status();
        }))

        await Deno.permissions.revoke(req)
    } else {
        console.log('failed to download -- please grant permissions to run scripts')
    }

    return repos;
}

export async function delete_repos(octokit) {

}

async function get_repos(octokit, is_org, name, reg) {
    let err;

    let repos = await octokit.paginate(`GET /${is_org ? `orgs` : `users` }/{owner}/repos`, {
        owner: name,
        per_page: 100
    }).catch(e => {
        console.log(e);
        return [];
    })

    cache[name] = repos;
    
    if (typeof reg == "string") {
        reg = new RegExp(reg)
    }

    return repos.filter((v) => {
        return reg.test(v.name)
    })
}

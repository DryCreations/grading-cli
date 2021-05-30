let repos = ['kit-static-error', 'manga-reader'];

await Promise.all(repos.map(async (r) => {
    const rm = Deno.run({
        cmd: ["rm", "-rf", `./tmp/${r}`]
    })
    
    await rm.status();
    
    const clone = Deno.run({
        cmd: ["git","clone",`https://github.com/DryCreations/${r}.git`, `./tmp/${r}`]
    })
    
    return clone.status();
}))

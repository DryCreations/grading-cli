# Grading CLI

```sh
deno run --unstable --no-check --location https://localhost mod.js
```

`--location https://localhost` is required to stop an error from `cliffy` calling location.

This will create and modify files in `./tmp/`

To compile an executable binary that can be run anywhere:

```
deno compile --unstable --no-check --location http://localhost --output ./tmp/grading mod.js --client={GITHUB_CLIENT_ID}
```

I suggest using gvisor to create sandboxed environments for grading, this will set up a container ready to run the grading program.

```
docker build -t grading .
```

```
docker run --runtime=runsc --rm -it grading
```
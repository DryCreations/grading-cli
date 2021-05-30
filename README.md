# Grading CLI

```sh
deno run --unstable --location https://localhost mod.js
```

`--location https://localhost` is required to stop an error from `cliffy` calling location.

This will create and modify files in `./tmp/`
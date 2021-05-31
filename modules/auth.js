import { Octokit } from "https://cdn.skypack.dev/octokit?dts";
import { createOAuthDeviceAuth } from "https://cdn.skypack.dev/@octokit/auth-oauth-device?dts";

export default async function() {
    const octokit = new Octokit({
        authStrategy: createOAuthDeviceAuth,
        auth: {
            clientType: "oauth-app",
            clientId: Deno.env.get('GITHUB_CLIENT_ID'),
            scopes: ["public_repo"],
            async onVerification (verification) {
                // verification example
                // {
                //   device_code: "3584d83530557fdd1f46af8289938c8ef79f9dc5",
                //   user_code: "WDJB-MJHT",
                //   verification_uri: "https://github.com/login/device",
                //   expires_in: 900,
                //   interval: 5,
                // };
                
                console.log("Open %s", verification.verification_uri);
                console.log("Enter code: %s", verification.user_code);
            },
        },
    });
    
    const {
        data: { login },
    } = await octokit.rest.users.getAuthenticated();
    
    console.log("Hello, %s", login);

    return octokit;
}
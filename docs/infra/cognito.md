# AWS Cognito setup — Identity service, version 1

Story `MVP1-E1-01`. This is the one-time setup you do in the AWS console so the Identity service can offer sign-up and sign-in. Nothing here is code.

| | |
|---|---|
| Region | **US East (N. Virginia), `us-east-1`** |
| Sign-in | Email and password, email verified by code |
| Sign-in page address | The AWS-provided address (`https://<prefix>.auth.us-east-1.amazoncognito.com`) |
| Not in this setup | Your own address `auth.01scale.com` and page branding (`MVP1-E1-07`), Sign in with Google (`MVP1-E1-08`), two-step verification |
| Time | About 45 minutes including the new AWS account |

> AWS renames console screens from time to time. If a label below does not match what you see, pick the closest one and note the difference here so this file stays rebuildable. The settings and values matter, not the exact button names.

## Part 0 — Create and secure an AWS account

1. Go to `aws.amazon.com` and choose **Create an AWS account**. Use an email address you will keep long term. This is the **root user**.
2. Enter a payment card and verify your phone. Choose the **Basic (free)** support plan.
3. Sign in as the root user. Open the account menu (top right) → **Security credentials** → **Assign MFA device**, and add an authenticator app. Do not skip this: the root user can do anything, including spend money.
4. Create a day-to-day admin user so you stop using root:
   - Open **IAM** → **Users** → **Create user**. Name it, tick **Provide user access to the AWS Management Console**, and attach the policy **AdministratorAccess**.
   - Sign out, then sign in as that user with the account's sign-in link (shown on the IAM dashboard). Add MFA to this user too.
5. Set a spending alert: open **Billing and Cost Management** → **Budgets** → **Create budget** → **Zero spend budget** (or a monthly cost budget of $5) with your email. You get an email if anything starts to cost money.
6. In the region selector (top right, next to your name) choose **US East (N. Virginia)**. Every step below must be done in this region.

## Part 1 — Create the user pool

1. In the search bar, open **Cognito** → **User pools** → **Create user pool**.
2. If asked for the application type, choose **Traditional web application**. (The Identity service runs on a server and can keep a secret.)
3. Application name: `01scale-identity`.
4. **Options for sign-in identifiers**: tick **Email** only.
5. **Required attributes for sign-up**: `email` only.
6. **Return URL**: `https://01scale.com/api/identity/v1/auth/callback`
7. Create the user pool. On the pool's overview, rename the pool to `01scale` if it was given a generated name.

## Part 2 — Sign-in and sign-up rules

Open the user pool, then in the left menu:

1. **Authentication → Authentication methods** (or **Sign-in**) → **Password policy** → Edit:
   - Minimum length **12**
   - Require a number, a special character, an uppercase letter and a lowercase letter
   - Temporary passwords expire in 7 days
2. **Authentication → Sign-up**:
   - **Self-registration**: enabled
   - **Attribute verification and user account confirmation**: allow Cognito to automatically send messages to verify; verify the **email** attribute
3. **Authentication → Sign-in → Multi-factor authentication**: **No MFA** (two-step verification is out of scope for this version).
4. **Authentication → Sign-in → User account recovery**: enable self-service recovery, delivered by **Email only**.
5. **Authentication methods → Email**: keep **Send email with Cognito**. This default sender is limited to about 50 emails a day, which is enough for a demo. Switching to Amazon SES with your own sender address is part of `MVP1-E1-07`.
6. If asked to choose a **feature plan**, choose **Essentials**. It includes the current managed login pages. Check AWS's current Cognito pricing page for the free allowance; at this project's size the expected cost is zero, and the budget alert from Part 0 will tell you otherwise.

## Part 3 — The sign-in page address

1. **Branding → Domain** → **Actions → Create Cognito domain**.
2. Enter a prefix, for example `01scale`. If it is taken, try `01scale-login`. The full address becomes `https://<prefix>.auth.us-east-1.amazoncognito.com`.
3. **Branding version**: choose **Managed login** (the newer pages), not Hosted UI (classic).
4. **Branding → Managed login** → **Create a style** for the app client `01scale-identity` and accept the defaults. Without a style the page shows an error. Colours and logo come later with `MVP1-E1-07`.

## Part 4 — The app client

**Applications → App clients** → open `01scale-identity`.

1. On the **App client information** tab, confirm there is a **Client secret**. If there is none, the wrong application type was chosen in Part 1; create a new app client of type *Traditional web application* instead.
2. Open the **Login pages** tab → **Edit** the managed login configuration:

   | Setting | Value |
   |---|---|
   | Allowed callback URLs | `https://01scale.com/api/identity/v1/auth/callback` and `http://localhost:3000/api/identity/v1/auth/callback` |
   | Allowed sign-out URLs | `https://01scale.com/` and `http://localhost:3000/` |
   | Identity providers | **Cognito user pool** only |
   | OAuth 2.0 grant types | **Authorization code grant** only (untick Implicit grant) |
   | OpenID Connect scopes | **OpenID** and **Email** only |

3. Back on **App client information** → **Edit**:
   - **Authentication flows**: leave only what the console requires; the service uses the authorization code flow through the login pages, not direct password flows.
   - **Refresh token expiration**: 1 day. The service does not use Cognito refresh tokens, so shorter is safer.
   - **Prevent user existence errors**: **Enabled**. This makes Cognito answer the same way whether or not an account exists.

## Part 5 — Collect the values

You need five values. Four are not secret; one is.

| Value | Where to find it | Example shape | Secret |
|---|---|---|---|
| Region | You chose it | `us-east-1` | No |
| User pool ID | User pool **Overview** | `us-east-1_AbCdEf123` | No |
| App client ID | **App clients** → `01scale-identity` | `4h8exampleclientid2k` | No |
| Sign-in page address | **Branding → Domain** | `https://01scale.auth.us-east-1.amazoncognito.com` | No |
| App client secret | **App clients** → `01scale-identity` → **Show client secret** | a long random string | **Yes** |

They map to the service's settings like this:

| Environment variable | Value |
|---|---|
| `COGNITO_ISSUER` | `https://cognito-idp.us-east-1.amazonaws.com/<User pool ID>` |
| `COGNITO_DOMAIN` | The sign-in page address |
| `COGNITO_CLIENT_ID` | The app client ID |
| `COGNITO_CLIENT_SECRET` | The app client secret |

**Where they go:** into the environment variables of the Identity service's Vercel project (and a local `.env.local` file that is never committed) when the service is built. **Never paste the client secret into a chat, an issue, a pull request or a file in the repository.** The four non-secret values are safe to share.

## Part 6 — Check it works

You can test the user pool before any 01scale code exists.

1. **App clients** → `01scale-identity` → **Login pages** tab → **View login page**.
2. Choose **Create an account**, sign up with your own email and a 12-character password, and enter the code Cognito emails you.
3. After signing in you are sent to `https://01scale.com/api/identity/v1/auth/callback?code=...`, which shows **Not found**. That is expected: the page does not exist until the service is built. Seeing `?code=` in the address means Cognito is set up correctly.
4. **User management → Users** now lists your email with **Confirmation status: Confirmed** and **Email verified: Yes**.
5. Try **Forgot your password?** on the login page and confirm the reset email arrives.

## Settings summary (for rebuilding)

| Area | Setting |
|---|---|
| Region | `us-east-1` |
| Pool name | `01scale` |
| Sign-in identifier | Email |
| Required attribute | `email` |
| Password policy | 12+ characters; number, special, upper and lower case |
| Self sign-up | Enabled, email verification by code |
| MFA | Off |
| Account recovery | Email only |
| Email sender | Cognito default |
| Domain | Cognito prefix domain, managed login (new) |
| App client | `01scale-identity`, confidential (has a secret) |
| Grant | Authorization code, with PKCE sent by the service |
| Scopes | `openid`, `email` |
| Callback URLs | Production and `localhost:3000` |
| Sign-out URLs | Production and `localhost:3000` |
| Prevent user existence errors | Enabled |

## What I need back from you

Once Part 6 passes, tell me these four values (not the secret): the user pool ID, the app client ID, the sign-in page address, and the prefix you chose. Also tell me any screen that did not match these steps.

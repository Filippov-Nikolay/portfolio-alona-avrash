# Security Policy

## Reporting a vulnerability

Please report security issues privately, not in a public issue or pull request.

Use GitHub's private reporting: open the **Security and quality** tab of this repository and choose
**Report a vulnerability**. Only the maintainer and you can see the report.

Please include:

- what is affected (the site, the admin, the analytics worker, or this repository);
- steps to reproduce, or a proof of concept;
- the impact you expect.

You will get a reply within 7 days. Once a fix ships, you are welcome to be credited in the
release notes.

## Supported versions

Only the latest release, deployed from `main`, receives security fixes.

## Scope

In scope:

- [avrash.com](https://avrash.com) and its API routes;
- the admin CMS;
- the analytics worker;
- the code in this repository.

Out of scope:

- denial of service and volumetric attacks;
- social engineering and physical attacks;
- findings that need a compromised device or browser;
- issues in third-party services (Vercel, Cloudflare, Resend, Upstash) that are not caused by how
  this project uses them.

Please test only against accounts and data you own, avoid degrading the service for others, and
give a reasonable time to fix an issue before disclosing it.

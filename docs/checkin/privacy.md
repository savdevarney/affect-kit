# Privacy: what we store, who processes it, and deleting it

**Status:** design and a draft notice, October 2026. The app isn't deployed, and no one else's data is in it. Everything here must be settled, and the notice live, before anyone but Sav uses it. Sources checked on 2026-10-05. Not legal advice.

These are health data: what someone felt, in their own words, several times a day. Under Washington's My Health My Data Act, the feeling words a model infers from their text count as consumer health data too, because the law covers data inferred "by any means, including algorithms or machine learning" ([RCW 19.373](https://app.leg.wa.gov/RCW/default.aspx?cite=19.373)).

## 1. What Probiome's privacy page taught us

Probiome's page ("Privacy, plainly", version 2) is the model. Here is each lesson, and what it means for this app:

| Lesson | In this app |
|---|---|
| **Plain words, versioned.** Consent records which version of the wording someone agreed to | The notice carries a version and a date; consent rows store the version |
| **A table of what we store, item by item, and why** | § 2 below |
| **Name every company that processes data,** and say which models | Cloudflare only (§ 3) |
| **Models we run, through a gateway with logging off;** no data sent to companies the page doesn't name | Workers AI through AI Gateway, logs off for the gateway and for each request. Third-party models proxied through Cloudflare (such as TypeSafe's Jev) are excluded, as Probiome decided for answers |
| **Deleting is specific and immediate,** with the backup window stated | § 4, with D1's real window |
| **No ads, no third-party analytics, no tracking cookies;** server logs never hold what people wrote | The Worker logs requests and errors, never bodies; the app never logs anyone's words |
| **Optional things are separate, off by default and revocable** | Research use and training are their own consents (§ 5) |
| **Connected AI apps:** what they read goes to that company, under its policy | When the log is offered over MCP (later), that wording comes with it |

## 2. What the app stores

| What | Why | Where |
|---|---|---|
| **Your face position** for each check-in (two numbers) | It's the check-in's anchor | D1 |
| **Your words**, as written | They're the record; the feeling words are found in them | D1 |
| **The feeling words**: each with how strong it is, the span of your words it came from, and whether you or the model chose it | So you can see and change them | D1 |
| **Your own words** that aren't among the 55 ("relieved") | So nothing you said is forced into a word you didn't mean | D1 |
| **Your changes** (kept, removed, changed, added) | They show where the word-finder is wrong; they're never shown to anyone | D1 |
| **How each check-in's words were found**: which model and version, how long it took, how many tokens | To compare models honestly. No text: the model's raw answer isn't kept | D1 |
| **Your time zone** at each check-in | So "today" means your today | D1 |
| **An account id** | To keep your log yours | D1 |
| **Server logs**: which address was asked for, when, and any errors | Keeping the service running. Kept by Cloudflare for a short window; never your words | Workers Logs |

**Not stored:** whether your words matched the crisis screen ([safety.md](safety.md) § 1); the model's raw output; your location; anything about your device beyond what a web request carries.

## 3. Who processes it

**Cloudflare, only:**
- hosting (Workers);
- the database (D1), created in the US jurisdiction ([data location](https://developers.cloudflare.com/d1/configuration/data-location/));
- the models that find feeling words (Workers AI, Cloudflare-hosted `@cf/` models only, through AI Gateway with logging off).

Cloudflare says it doesn't use Workers AI inputs to train models ([data usage](https://developers.cloudflare.com/workers-ai/platform/data-usage/)). D1 encrypts data at rest (AES-256-GCM) and in transit ([data security](https://developers.cloudflare.com/d1/reference/data-security/)).

**Sign-in** will add one more, depending on the choice in § 6.

**About AI Gateway logging:**
- The Workers AI binding can turn a request's log off (`collectLog: false`), but it can't drop just the payload while keeping metadata. So the gateway's logs are off entirely, and each run's time and tokens are recorded by the app itself ([logging](https://developers.cloudflare.com/ai-gateway/observability/logging/)).
- Log classification stays off: it reads stored prompts.

## 4. Deleting things

| Action | What goes |
|---|---|
| **Delete a check-in** | Its words, feeling words, your own words, your changes and its extraction runs, at once. Tested against D1: `apps/checkin/test/d1-repository.test.ts` |
| **Delete a day** (to build) | Every check-in that day, the same way |
| **Delete your account** (to build) | Everything, at once; signing in again first, so no one else can do it |

**The backup window, stated plainly.** D1 keeps a point-in-time history called Time Travel. It's always on, and it lasts **30 days on the paid plan** (7 on free) ([Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)):
- A restore rolls back the whole database, so one person's rows can't be restored on their own.
- The notice must say it: "Deleted check-ins can be recovered from database backups for up to 30 days, then they're gone for good."
- That's longer than Probiome's 7 days.
- Washington's law says deletion must reach backups and processors. How a 30-day point-in-time window fits that is a question for a lawyer before launch.

**A model can't forget.** If someone has opted in to training (§ 5), a deleted check-in leaves every future training set, but a model already trained on it can't fully forget it. Probiome's wording says exactly this; use it.

## 5. Consent

| Consent | Default | What it covers |
|---|---|---|
| **The log** (required) | — | Storing your check-ins and finding feeling words in them with models run on Cloudflare |
| **Help improve the word-finder** | Off | Using your words and your changes to test and train the word-finder. Revocable: from then on, your check-ins leave future training sets. Check-ins that matched the crisis screen are never used ([safety.md](safety.md) § 3) |
| **Research** | Off | Only if a real study exists, with its own wording, partner and approval ([clinical-instruments.md](clinical-instruments.md)). Never assumed from the other two |

Each consent is a row: what you agreed to, which version of the wording, and when.

**Why separate consents:**
- **Washington (MHMDA):** collecting more than the service needs takes opt-in consent, sharing takes a separate consent, people can ask for the list of third parties, and they can sue ([RCW 19.373](https://app.leg.wa.gov/RCW/default.aspx?cite=19.373)).
- **Nevada SB 370:** similar consents ([NRS 603A](https://www.leg.state.nv.us/NRS/NRS-603A.html)).
- **Connecticut:** since July 2026, privacy notices must say whether data trains large language models ([CGA](https://www.cga.ct.gov/current/pub/chap_743jj.htm)).

## 6. Accounts

Not decided; it's Sav's call. Here are the options, least data first:

| Option | Data | Processor | Trade-off |
|---|---|---|---|
| **Cloudflare Access** (for the private deploy) | An email, held by Access | Cloudflare | For Sav and a few invited testers only; not a product sign-in |
| **Passkeys only** (WebAuthn) | No email at all: a public key per device | none | The least data possible, and a web standard. Recovery leans on the platform's passkey sync |
| **Email code** (like Probiome) | An email address | an email sender, such as Resend | Familiar; one more company on the notice |
| **Supabase Auth** | An email address | Supabase | Familiar from Probiome; a second processor for the whole app |

**Recommended:** Access for the private deploy now. Passkeys first when anyone else arrives, with email as a decision for later.

## 7. Local-first, as a research track

The lexicon runs anywhere, the phone included. A small on-device classifier ([evals.md](evals.md) § 9) could find words without a server. In a local-first mode, words would never leave the device. Only the person's own choice to sync would. It's the strongest privacy promise this app could make, and the one affect-kit's research page asks for.

**A note on that page.** affectkit.com/research asks apps built on affect-kit to "store ratings with end-to-end encryption at rest". End-to-end encryption means the server can't read the data, and this app's server reads words to find feeling words. So this app offers encryption at rest, deletion that deletes, and later a local-first mode. The page's wording should say that more precisely, in its own PR.

## 8. The notice, a first draft

The live page follows Probiome's shape: version, plain sections, tables.

> **Privacy, plainly.** Version 0 (draft).
>
> **What we keep.** Each check-in: where you put the face, what you wrote, the feeling words found in it and the ones you changed or added, and when. An account id. Nothing about where you are.
>
> **Who helps us run it.** Cloudflare hosts the app, stores your log in the US, and runs the AI models that find feeling words in what you write: models Cloudflare hosts, with logging off. Your words aren't sent to any other AI company.
>
> **Training.** We don't use your words to train models unless you turn on "Help improve the word-finder", and you can turn it off at any time.
>
> **Crisis words.** If what you write suggests you might be in crisis, the app shows you crisis lines straight away. It doesn't tell anyone, and it doesn't record that it happened to you; we only count, per day, how many times the lines were shown, with nothing that points to anyone.
>
> **Deleting.** Delete a check-in and everything found in it goes at once. Delete your account and everything goes. Deleted data can be recovered from database backups for up to 30 days, then it's gone for good.
>
> **Not medical advice.** This is a log of the words you choose. It can't diagnose anything or tell you what to do.

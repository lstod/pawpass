import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Privacy · PawPass",
};

const h2 = "mt-8 text-lg font-semibold";
const p = "mt-3 leading-relaxed";
const ul = "mt-3 list-disc space-y-2 pl-5 leading-relaxed";
const link = "font-medium underline underline-offset-4 break-words";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <p>
        <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4">
          ← Back to PawPass
        </Link>
      </p>

      <Card className="mt-4 gap-0 px-5 py-6 text-sm sm:px-8 sm:text-base">
        <h1 className="text-2xl font-bold">PawPass privacy policy</h1>
        <p className="mt-2 text-muted-foreground">Last updated: 1 November 2026</p>

        <h2 className={h2}>Who I am</h2>
        <p className={p}>
          PawPass is a personal project by Liam Stoddard, in Vancouver, BC. It’s free, it has
          no ads, and it isn’t sold.
        </p>

        <h2 className={h2}>What I collect, and why</h2>
        <ul className={ul}>
          <li>
            <strong>Name and email address</strong>, from the sign-up form, to identify your
            account and sign you in.
          </li>
          <li>
            <strong>Password</strong>, from the sign-up form. It’s stored only as a salted hash
            by Better Auth, the sign-in library, and never in plain text.
          </li>
          <li>
            <strong>IP address and browser user agent</strong>, recorded automatically by Better
            Auth when you sign in. They’re stored with that session’s record, and PawPass
            doesn’t use them for anything else.
          </li>
          <li>
            <strong>Your settings</strong>: pass days, Baker days, season and opening dates,
            terrain, visibility, dog floor, penalties, the optional Baker ticket price, and
            whether you’ve finished the walkthrough. I use these to compute your calls.
          </li>
          <li>
            <strong>Logged ski days</strong> (date and hill) <strong>and starred weekends</strong>,
            to count your days left and pin weekends.
          </li>
        </ul>

        <h2 className={h2}>What I don’t collect</h2>
        <p className={p}>
          There are no analytics, ads, tracking pixels or third-party scripts. Nothing is sold
          or shared for marketing. PawPass sends no email: there’s no verification email and no
          newsletter. Fonts are served by PawPass itself, not loaded from Google when you view a
          page.
        </p>

        <h2 className={h2}>Cookies</h2>
        <p className={p}>
          PawPass sets one cookie: a sign-in session cookie from Better Auth, needed to keep you
          signed in. It lasts 7 days and renews while you use the app. There are no other
          cookies, which is why there’s no cookie banner.
        </p>

        <h2 className={h2}>Demo accounts</h2>
        <p className={p}>
          “Try the demo” creates an account with a random made-up email address and no personal
          details. That account and everything entered in it (settings, logged days, starred
          weekends and sessions) are deleted automatically 24 hours after it was created.
        </p>

        <h2 className={h2}>Where your data is stored</h2>
        <p className={p}>
          Your data is stored in an SQLite database on one DigitalOcean server in Toronto,
          Canada. The site is served over HTTPS, with a certificate from Let’s Encrypt, which
          receives no user data. The server has no backups.
        </p>

        <h2 className={h2}>Server logs</h2>
        <p className={p}>
          The web server (nginx) logs each request’s IP address, time, the address requested
          and the browser user agent, for security and troubleshooting. These logs rotate daily
          and are deleted after 14 days. The app’s own logs record errors and system events, not
          what you enter.
        </p>

        <h2 className={h2}>Other services</h2>
        <p className={p}>
          Weather data comes from Open-Meteo, fetched by the server on a schedule. None of your
          data is sent to Open-Meteo or anyone else. The code is hosted on GitHub, which never
          receives app data.
        </p>

        <h2 className={h2}>How long I keep it</h2>
        <p className={p}>
          I keep your account data until you ask me to delete it. Session records stay with your
          account until you sign out or the account is deleted.
        </p>

        <h2 className={h2}>Your choices</h2>
        <ul className={ul}>
          <li>
            <strong>See or change your data:</strong> your settings, logged days and starred
            weekends are all visible and editable in the app.
          </li>
          <li>
            <strong>Get a copy, or have your account deleted:</strong> email{" "}
            <a href="mailto:lstodd@protonmail.com" className={link}>
              lstodd@protonmail.com
            </a>{" "}
            from the address you signed up with. I’ll reply and act within 30 days. There’s no
            delete button in the app.
          </li>
          <li>
            <strong>Questions about this policy:</strong> open an issue on GitHub at{" "}
            <a href="https://github.com/lstod/pawpass/issues" className={link}>
              github.com/lstod/pawpass/issues
            </a>
            . Issues are public, so don’t put your email address or other personal details in
            one. Email me about anything to do with your own account.
          </li>
          <li>
            <strong>Complaints:</strong> you can also contact the Office of the Information and
            Privacy Commissioner for British Columbia at{" "}
            <a href="https://www.oipc.bc.ca" className={link}>
              oipc.bc.ca
            </a>
            .
          </li>
        </ul>

        <h2 className={h2}>Children</h2>
        <p className={p}>PawPass isn’t meant for children under 13.</p>

        <h2 className={h2}>Changes</h2>
        <p className={p}>
          The date at the top shows when this policy last changed, and every change is visible
          in the project’s history on GitHub.
        </p>
      </Card>
    </main>
  );
}

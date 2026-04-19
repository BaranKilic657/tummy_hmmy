"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AUTH_ACCOUNT_TYPE_KEY, AUTH_LOGIN_KEY } from "@/lib/auth-session";

export default function LoginPage() {
  const router = useRouter();
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    document.body.classList.add("loginPage");

    return () => {
      document.body.classList.remove("loginPage");
    };
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("j_username") ?? "").trim().toLowerCase();
    const password = String(formData.get("j_password") ?? "").trim();

    if (!username || !password) {
      setLoginError("Please enter both username and password.");
      return;
    }

    if (!username.includes("@tum.de")) {
      setLoginError("Username or password was incorrect.");
      return;
    }

    setLoginError("");
    sessionStorage.setItem(AUTH_LOGIN_KEY, "true");
    sessionStorage.setItem(AUTH_ACCOUNT_TYPE_KEY, "member");
    localStorage.removeItem(AUTH_LOGIN_KEY);
    window.dispatchEvent(new Event("auth-state-changed"));
    router.push("/");
  };

  return (
    <div className="loginPage">
      <link
        rel="stylesheet"
        type="text/css"
        href="/idp/css/main.css?v20200713-1"
      />
      <script type="text/javascript" src="https://login.tum.de/idp/js/main.js?v20180425-3" />

      <div className="wrapper">
        <div id="header">
          <div id="nav">
            <a
              className="aai"
              hrefLang="de"
              href="https://login.tum.de/idp/profile/SAML2/Redirect/SSO?execution=e1s2&lang=de"
              title="Zu deutsch wechseln"
              aria-label="Zu deutsch wechseln"
              role="button"
            >
              de | <strong>en</strong>
            </a>
          </div>

          <div className="logo-bar">
            <div className="logo-left" />
            <div className="logo-right">
              <img
                id="tum-logo"
                src="https://login.tum.de/idp/images/tum-logo.png"
                alt="TUM"
                width="73"
                height="38"
              />
            </div>
          </div>
        </div>

        <div className="container">
          <div id="content" className="content">
            <h1 id="title-h1" tabIndex={0}>
              TUM Login
            </h1>
            <p>Login using your TUM-ID to:</p>
            {loginError ? (
              <p role="alert" className="login-error-banner">
                {loginError}
              </p>
            ) : null}

            <div id="sp-info">
              <h2 id="title-h2">TUM Moodle</h2>
              <p id="sp-description">
                Technical University of Munich, Moodle Learning Management
                System
              </p>
              <p>
                <a
                  href="https://www.moodle.tum.de/?lang=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="External Link: Website of this Service"
                >
                  Website
                </a>{" "}
                |{" "}
                <a
                  href="https://www.moodle.tum.de/mod/page/view.php?id=153874"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="External Link: Data Provacy Statement of this Service"
                >
                  Privacy Statement
                </a>
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              action="https://login.tum.de/idp/profile/SAML2/Redirect/SSO?execution=e1s2"
              method="post"
            >
              <input
                type="hidden"
                name="csrf_token"
                value="_dff50ee356dac1656f520783976e039345e21fde"
              />

              <div className="form-element-wrapper">
                <label id="label-username" htmlFor="username">
                  Username
                </label>
                <input
                  className="form-element form-field"
                  id="username"
                  name="j_username"
                  type="text"
                  placeholder="e.g. go42tum / example@tum.de"
                  autoComplete="username"
                  autoFocus
                  aria-required="true"
                  required
                  aria-labelledby="tum-logo label-username"
                  inputMode="email"
                />
              </div>

              <div className="form-element-wrapper">
                <label id="label-password" htmlFor="password">
                  Password
                </label>
                <input
                  className="form-element form-field"
                  id="password"
                  name="j_password"
                  type="password"
                  autoComplete="current-password"
                  aria-required="true"
                  required
                  aria-labelledby="tum-logo label-password"
                />
              </div>

              <div className="form-element-wrapper option-row">
                <input
                  type="checkbox"
                  name="donotcache-dummy"
                  id="donotcache-dummy"
                  value="1"
                  title=""
                />
                <input type="hidden" name="donotcache" id="donotcache" value="1" />
                <label id="donotcache-dummy-label" htmlFor="donotcache-dummy" title="">
                  keep me logged in <sup>(1)</sup>
                </label>
              </div>

              <div className="form-element-wrapper option-row">
                <input
                  id="_shib_idp_revokeConsent"
                  type="checkbox"
                  name="_shib_idp_revokeConsent"
                  value="true"
                />
                <label htmlFor="_shib_idp_revokeConsent">
                  show data being transmitted <sup>(2)</sup>
                </label>
              </div>

              <div className="form-element-wrapper login-btn-wrapper">
                <button
                  id="btnLogin"
                  className="btnLogin"
                  type="submit"
                  name="_eventId_proceed"
                >
                  Login
                </button>
                <a
                  className="forgot-password"
                  href="https://go.tum.de/passwort"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Forgot your password?
                </a>
              </div>
            </form>
          </div>
        </div>

        <div id="explanation" className="explanation">
          <div id="loginExplanation" className="section">
            <p>
              <b>Log in using:</b>
            </p>
            <ul>
              <li>
                Your{" "}
                <b>
                  <a
                    href="https://www.it.tum.de/en/it/faq/account-login-tum-id-mwnid-tumcard/tum-id/what-is-the-tum-id-tum-kennung/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    TUM username / TUM ID
                  </a>
                </b>{" "}
                or
              </li>
              <li>
                Your <b>@tum.de</b> or <b>@mytum.de</b> e-mail address
              </li>
            </ul>
            <p>
              1) By checking <i>"keep me logged in"</i> you have access to all
              services using this login (Shibboleth) without having to enter
              your credentials again for the time your browser is opened. To
              perform a complete logout afterwards, please close your browser
              completely.
            </p>
            <p>
              2) Shibboleth Single Sign-On (SSO) allows you to log in safely to
              Web applications run by TUM and other parties using your TUM
              credentials. To ensure your privacy, checking
              <i> "show data being transmitted"</i> allows you to view and
              approve the data beeing transmitted to the service beforehand.
            </p>
          </div>
        </div>

        <div id="footer">
          <div className="footer-bar">
            <a
              href="https://www.tum.de/en/about-tum/contact-directions/legal-details/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Imprint
            </a>
            <span>&nbsp;&nbsp;</span>
            <a
              href="https://portal.mytum.de/kompass/datenschutz/Shibboleth"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Statement
            </a>
            <span>&nbsp;&nbsp;</span>
            <a
              href="https://www.it.tum.de/en/it/it-service-center/organisation/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contact and FAQ
            </a>
            <img
              src="https://tum.de/hsts/default"
              height="1"
              width="1"
              alt=""
            />
          </div>
        </div>
      </div>
    </div>
  );
}
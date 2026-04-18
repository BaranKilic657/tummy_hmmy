export default function Head() {
  return (
    <>
      <link
        rel="alternate"
        hrefLang="en"
        href="https://login.tum.de/idp/profile/SAML2/Redirect/SSO?execution=e1s2&lang=en"
      />
      <link
        rel="alternate"
        hrefLang="de"
        href="https://login.tum.de/idp/profile/SAML2/Redirect/SSO?execution=e1s2&lang=de"
      />
      <meta httpEquiv="content-language" content="en" />
      <meta name="theme-color" content="#3070b3" />
      <link
        rel="stylesheet"
        type="text/css"
        href="/idp/css/main.css?v20200713-1"
      />
      <link
        rel="shortcut icon"
        type="image/x-icon"
        href="https://login.tum.de/idp/images/favicon.ico"
      />
      <script
        type="text/javascript"
        src="https://login.tum.de/idp/js/main.js?v20180425-3"
      />
      <title>TUM Shibboleth IdP - Login</title>
    </>
  );
}
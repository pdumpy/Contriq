"use client";

import { useRef } from "react";

export function FooterBar() {
  const terms = useRef<HTMLDialogElement>(null);
  const privacy = useRef<HTMLDialogElement>(null);

  return (
    <footer className="footer curtain-footer-bar">
      <p className="curtain-footer-credit">
        <strong aria-label="CONTRIQ">CO<span className="brand-n">N</span>TRIQ</strong>
        <span className="curtain-footer-separator" aria-hidden="true">/</span>
        OSWAR/teck
      </p>
      <div className="curtain-footer-details">
        <p>© 2026 CONTRIQ, made in India</p>
        <nav aria-label="Footer links">
          <button type="button" aria-haspopup="dialog" onClick={() => terms.current?.showModal()}>
            Terms of use
          </button>
          <span aria-hidden="true">|</span>
          <button type="button" aria-haspopup="dialog" onClick={() => privacy.current?.showModal()}>
            Privacy Policy
          </button>
        </nav>
      </div>
      <dialog ref={terms} aria-labelledby="footer-terms-title">
        <h2 id="footer-terms-title">Terms of use</h2>
        <p>Contriq demonstrates performance scoring with fictional employees and work records. Scores are advisory and unsuitable for employment decisions.</p>
        <form method="dialog"><button type="submit" className="button">Close</button></form>
      </dialog>
      <dialog ref={privacy} aria-labelledby="footer-privacy-title">
        <h2 id="footer-privacy-title">Privacy Policy</h2>
        <p>This demonstration uses fictional employee data. It has no employee sign-in or evidence upload form. Keep real employee information out of the demo.</p>
        <form method="dialog"><button type="submit" className="button">Close</button></form>
      </dialog>
    </footer>
  );
}

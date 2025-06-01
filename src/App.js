import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Moon, Sun, Menu, X } from 'lucide-react';
import styles from './App.module.css';

// ───────────────────────────────────────────────────── NavBar ─────────────────────────────────────────────────────
function NavBar({ darkMode, toggleDarkMode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>Sikh Federation (Canada)</div>

      {/* Desktop Links */}
      <div className={styles.navLinks}>
        <Link to="/" className={styles.navItem}>Home</Link>
        <Link to="/about" className={styles.navItem}>About</Link>
        <Link to="/contact" className={styles.navItem}>Contact</Link>
      </div>

      {/* Theme Toggle (desktop) */}
      <button className={styles.themeToggle} onClick={toggleDarkMode} aria-label="Toggle theme">
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Hamburger (mobile only) */}
      <button
        className={styles.hamburger}
        onClick={() => setMobileOpen(open => !open)}
        aria-label="Menu"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className={styles.mobileMenu}>
          {/* Top bar: Title and Close */}
          <div className={styles.mobileHeader}>
            <div className={styles.mobileLogo}>Sikh Federation (Canada)</div>
            <button
              className={styles.mobileClose}
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>

          {/* Divider between header and first link */}
          <div className={styles.mobileDivider} />

          {/* Menu Links with separators */}
          <nav className={styles.mobileNavLinks}>
            <Link to="/" className={styles.mobileItem} onClick={() => setMobileOpen(false)}>
              Home
            </Link>
            <div className={styles.mobileDivider} />
            <Link to="/about" className={styles.mobileItem} onClick={() => setMobileOpen(false)}>
              About
            </Link>
            <div className={styles.mobileDivider} />
            <Link to="/contact" className={styles.mobileItem} onClick={() => setMobileOpen(false)}>
              Contact
            </Link>
            <div className={styles.mobileDivider} />
          </nav>

          {/* Footer: Email Now (left) and theme toggle (right) */}
          <div className={styles.mobileFooter}>
            <button
              className={styles.mobileEmailButton}
              onClick={() => {
                const formSection = document.getElementById('emailForm');
                if (formSection) {
                  formSection.scrollIntoView({ behavior: 'smooth' });
                }
                setMobileOpen(false);
              }}
            >
              Email Now
            </button>

            <button
              className={styles.mobileThemeToggle}
              onClick={toggleDarkMode}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

// ───────────────────────────────────────────────────── HomePage ─────────────────────────────────────────────────────
function HomePage() {
  const [firstName, setFirstName]     = useState('');
  const [lastName, setLastName]       = useState('');
  const [email, setEmail]             = useState('');
  const [postalCode, setPostalCode]   = useState('');
  const [mpData, setMpData]           = useState(null);
  const [emailBody, setEmailBody]     = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);

  const generateBody = mpName => (
    `Dear ${mpName},\n\n` +
    `I am writing as a concerned constituent from ${postalCode} about reports that the Government of Canada is considering inviting Indian representatives to participate in the G7 Leaders’ Summit next month.\n\n` +
    `To consider the restoration of ties with a regime that orchestrated the assassination of Shaheed Bhai Hardeep Singh Nijjar—and continues to threaten Sikh lives across Canada—is a significant affront to every family and community who has been impacted by this violence.\n\n` +
    `Normalization with India, without concrete steps towards accountability and justice, would be reprehensible given the overwhelming evidence of India’s aggressive foreign interference and violent campaigns targeting Sikhs in Canada.\n\n` +
    `Canadian representatives must ensure that no official representing the Government of India is invited to attend until India substantially cooperates with criminal investigations in Canada, and makes other demonstrable reforms.\n\n` +
    `I urge you to stand up for justice and accountability by taking the following actions:\n\n` +
    `1. Call on the Government of Canada to publicly affirm its commitment to demand accountability from India for its documented crimes on Canadian soil. Canada must demonstrate the political will to ensure Indian officials cooperate with Canadian investigations.\n\n` +
    `2. Call on the Government of Canada to ensure that no Indian representatives are invited to G7 events under any circumstances without India substantially cooperating with criminal investigations in Canada, and making other demonstrable reforms, including respecting human rights, ceasing transnational repression, and ending disinformation campaigns against Canadian officials and communities.\n\n` +
    `3. Take steps to implement targeted sanctions against Indian officials, including Home Affairs Minister Amit Shah and others credibly linked to orchestrating violence and interference in Canada.\n\n` +
    `I trust that you will recognize the gravity of this issue and take the right steps to ensure the safety and dignity of all communities in Canada.\n\n` +
    `Sincerely,\n${firstName} ${lastName}`
  );

  const findMP = async (event) => {
    event.preventDefault();
    if (!postalCode || postalCode.trim() === '') {
      alert('Please enter a valid postal code.');
      return;
    }
    try {
      const res = await axios.get(`/api/get-mp?postal=${encodeURIComponent(postalCode)}`);
      const { mp_name, mp_email } = res.data;
      if (!mp_email) {
        throw new Error('No email found for your MP.');
      }
      // Set mpData to be used in modal
      setMpData({ name: mp_name, email: mp_email });
      setEmailBody(generateBody(mp_name));
      setShowModal(true);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error finding your MP';
      alert(msg);
    }
  };

  const sendEmail = () => {
    if (!mpData) return;
    const subject = 'Urgent Request: Do Not Invite Indian Delegation to G7 Summit';
    const ccList = ['pm@pm.gc.ca','anita.anand@international.gc.ca','gary.anand@parl.gc.ca','maninder.sidhu@parl.gc.ca','mcu@justice.gc.ca','steven.guilbeault@parl.gc.ca','pierrepoilievre@consesrvative.ca','yves-francois.blanchet@parl.gc.ca','don.davies@parl.gc.ca'
    ].join(',');
    const bodyEnc = encodeURIComponent(emailBody);

    window.open(
      `mailto:${mpData.email}?cc=${ccList}&subject=${encodeURIComponent(subject)}&body=${bodyEnc}`,
      '_blank'
    );

    fetch(
      'https://script.google.com/macros/s/AKfycbyehZjSH_tZQMrNKOqOrqtk2bOVgCyqbN5bJgepB7XgSTpr9MMhNUnLqSGEDmy8MIhauA/exec',
      {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          postalCode,
          mpName: mpData.name,
          mpEmail: mpData.email,
        })
      }
    );

    setTimeout(() => {
      setShowModal(false);
      setShowThankYouModal(true);
    }, 2000);
  };

  return (
    <>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Join Our Campaign</h1>
          <h2 className={styles.heroSubTitle}>
            Don’t Stay Silent — Send a Pre-Written Email to Your MP in Seconds by clicking on the button below.
          </h2>
          <button
            className={styles.heroButton}
            onClick={() => {
              const formSection = document.getElementById('emailForm');
              if (formSection) formSection.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Email Now
          </button>
        </div>
        <div className={styles.heroImageWrapper}>
          <img
            src="/images/hero--image.jpeg"
            alt="Campaign spotlight"
            className={styles.heroImage}
          />
        </div>
      </section>

      {/* Action Items Section */}
      <section className={styles.actionsSection}>
        <p className={styles.sectionIntro}>Our Campaign</p>
        <h2 className={styles.sectionHeading}>Make your voice heard.</h2>
        <p className={styles.sectionSubtext}>
          Members of Parliament need to stand up for justice and accountability by taking the following actions
        </p>
        <div className={styles.actionsGrid}>
          <div className={styles.actionCard}>
            <h3 className={styles.actionHeading}>Accountability</h3>
            <p>
              Call on the Government of Canada to clarify its commitment to demand accountability from India
              for its documented crimes on Canadian soil.
            </p>
          </div>
          <div className={styles.actionCard}>
            <h3 className={styles.actionHeading}>Cooperation in Investigations</h3>
            <p>
              Call on the Government of Canada to ensure that no Indian representatives are invited to G7
              events under any circumstances without India substantially cooperating with criminal
              investigations in Canada, and making other demonstrable reforms, including respecting human
              rights, ceasing transnational repression, and ending disinformation campaigns against Canadian
              officials and communities.
            </p>
          </div>
          <div className={styles.actionCard}>
            <h3 className={styles.actionHeading}>Targeted Sanctions</h3>
            <p>
              Take steps to implement targeted sanctions against Indian officials, including Home Affairs
              Minister Amit Shah and others credibly linked to orchestrating violence and interference in
              Canada.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Image Section */}
      <div className={styles.featureImageWrapper}>
        <img
          src="/images/feature-image.jpeg"
          alt="Feature"
          className={styles.featureImage}
        />
      </div>

      {/* Form Section (Email Your MP) */}
      <section className={styles.formSection} id="emailForm">
        <div className={styles.formImageWrapper}>
          <img
            src="/images/form-side-image.jpeg"
            alt="Standing for Justice"
            className={styles.formSideImage}
          />
        </div>
        <div className={styles.formContentWrapper}>
          {/* Faint top divider */}
          <div className={styles.formTopDivider} />

          {/* Heading */}
          <h2 className={styles.formHeading}>Email Your MP</h2>

          {/* Quote / description */}
          <p className={styles.formQuote}>
            The Government of Canada is considering inviting Indian officials to the G7 Leaders' Summit in June. Contact your MP to let them know that any normalization with India, without concrete steps towards justice and accountability, is unacceptable.
          </p>

          {/* Numbered steps */}
          <ol className={styles.formSteps}>
            <li>We will look up your MP based on your postal code</li>
            <li>A pre-written email will be created for you</li>
            <li>All you need to do is review and press 'Send'</li>
          </ol>

          {/* Input form wrapped in a form tag */}
          <form onSubmit={findMP}>
            <div className={styles.formGroup}>
              <label className={styles.label}>First Name</label>
              <input
                className={styles.input}
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Last Name</label>
              <input
                className={styles.input}
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Enter your last name"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                className={styles.input}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Postal Code (e.g., L6R 0S4)</label>
              <input
                className={styles.input}
                value={postalCode}
                onChange={e => setPostalCode(e.target.value.toUpperCase())}
                placeholder="Enter your postal code"
                required
              />
            </div>

            {/* Find My MP button (left-aligned) */}
            <div className={styles.buttonWrapperLeft}>
              <button type="submit" className={styles.button}>
                Find My MP
              </button>
            </div>
          </form>

          {/* Bottom full-width divider */}
          <div className={styles.formBottomDivider} />
        </div>
      </section>

      {/* Email Preview Modal */}
      {showModal && mpData && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h3>Email Preview</h3>
              <button 
                className={styles.modalClose} 
                onClick={() => setShowModal(false)} 
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <p><strong>To:</strong> {mpData.email}</p>
            <p><strong>Subject:</strong> Urgent Request: Do Not Invite Indian Delegation to G7 Summit</p>
            <label className={styles.label}>Message</label>
            <textarea
              className={styles.input}
              rows={8}
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
            />
            <div className={styles.buttonWrapper}>
              <button className={styles.button} onClick={sendEmail}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thank You Modal */}
      {showThankYouModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3>Thank You!</h3>
            <p>Your email has been sent to your mail app successfully. Please ensure you have pressed send.</p>
            <div className={styles.buttonWrapper}>
              <button className={styles.button} onClick={() => setShowThankYouModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ───────────────────────────────────────────────────── AboutPage ─────────────────────────────────────────────────────
function AboutPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.mainTitle}>About</h1>
      <p className={styles.contextText}>
        Sikh Federation (Canada) is a Sikh advocacy organization dedicated to empowering the Sikh community in Canada to advocate for dignity, justice, and self-determination.<br /><br />
        Find us at <a href="https://sikhfederation.ca" target="_blank" rel="noopener noreferrer">sikhfederation.ca</a>
      </p>
    </div>
  );
}

// ───────────────────────────────────────────────────── ContactPage ─────────────────────────────────────────────────────
function ContactPage() {
  const [message, setMessage] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    alert('Thank you for reaching out!');
    setMessage('');
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.mainTitle}>Contact Us</h1>
      <form onSubmit={handleSubmit} className={styles.formGroup}>
        <label className={styles.label}>Your Message</label>
        <textarea
          className={styles.input}
          rows={6}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type your message here..."
        />
        <button type="submit" className={styles.button}>Send</button>
      </form>
    </div>
  );
}

// ───────────────────────────────────────────────────── App ─────────────────────────────────────────────────────
export default function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <BrowserRouter>
      <NavBar darkMode={darkMode} toggleDarkMode={() => setDarkMode(d => !d)} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
    </BrowserRouter>
  );
}
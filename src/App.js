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
    `I am writing as a concerned constituent from ${postalCode} about the reports that the Canadian ` +
    `To speak of shared priorities with a regime that orchestrated the assassination of Shaheed Bhai Hardeep Singh Nijjar—and continues to threaten Sikh lives across Canada—is an affront our community and every community who believes in justice and basic human rights.\n\n` +
    `We demand three immediate actions from the Government of Canada:\n\n` +
    `1. Public affirm Canada’s commitment to holding India accountable for its crimes and interference on Canadian soil.\n\n` +
    `2. Guarantee that no Indian officials will be invited to G7 events or any official Canadian forum until India cooperates fully with criminal investigations, ends its campaign of repression, and demonstrates clear reforms.\n\n` +
    `3. Impose targeted sanctions on Indian officials—especially Home Affairs Minister Amit Shah—who are credibly implicated in orchestrating violence in Canada.\n\n` +
    `I trust that you will recognize the gravity of this issues and take the right steps to ensure the safety and dignity of all communities in Canada.\n\n` +
    `Sincerely,\n${firstName} ${lastName}`
  );

  const findMP = async (event) => {
    event.preventDefault();
    try {
      const res = await axios.get(
        `https://represent.opennorth.ca/postcodes/${encodeURIComponent(postalCode)}/`
      );
      const mp = res.data.representatives_centroid.find(r => r.elected_office === 'MP');
      if (!mp) throw new Error('No MP found for that postal code');
      setMpData(mp);
      setEmailBody(generateBody(mp.name));
      setShowModal(true);
    } catch (err) {
      alert(err.message || 'Error finding your MP—please check your postal code.');
    }
  };

  const sendEmail = () => {
    if (!mpData) return;
    const subject = 'Urgent Request: Do Not Invite Indian Delegation to G7 Summit';
    const ccList = ['info@ontariogurdwaras.com','bill.blair@parl.gc.ca','pm@pm.gc.ca','katharine.heus@pmo-cpm.gc.ca','shaili.patel@pmo-cpm.gc.ca','melanie.joly@parl.gc.ca','anita.anand@international.gc.ca'
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
            Tell your MP that Indian officials responsible for violence cannot be invited to the G7
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
            src="/images/hero-image.jpeg"
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
            Confirmed information received by the Sikh Federation Canada indicates that newly elected Prime Minister Mark Carney
            and Foreign Minister Anita Anand are prioritizing trade interests at the expense of Canadian sovereignty and public safety...
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
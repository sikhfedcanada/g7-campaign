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
      <div className={styles.logo}>Ontario Gurdwaras</div>

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
        onClick={() => setMobileOpen(o => !o)}
        aria-label="Menu"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className={styles.mobileMenu}>
          <Link to="/" className={styles.mobileItem} onClick={() => setMobileOpen(false)}>Home</Link>
          <Link to="/about" className={styles.mobileItem} onClick={() => setMobileOpen(false)}>About</Link>
          <Link to="/contact" className={styles.mobileItem} onClick={() => setMobileOpen(false)}>Contact</Link>
          <button className={styles.mobileThemeToggle} onClick={toggleDarkMode} aria-label="Toggle theme">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      )}
    </nav>
  );
}

// ───────────────────────────────────────────────────── HomePage ─────────────────────────────────────────────────────
function HomePage() {
  // form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [mpData, setMpData]       = useState(null);
  const [emailBody, setEmailBody] = useState('');
  const [showModal, setShowModal]         = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);

  // build default email
  const generateBody = mpName => (
    `Dear ${mpName},\n\n` +
    `I am writing as a concerned constituent from ${postalCode} to strongly urge you to oppose any invitation to officials from the Government of India to the upcoming G7 Summit in Canada.\n\n` +
    `The Ontario Gurdwaras Committee and many others have raised serious concerns regarding foreign interference, threats to Canadian sovereignty, and violence targeting Sikh Canadians, all of which remain unresolved. No invitation should be extended until there is full cooperation with Canadian criminal investigations and substantive reforms by the Government of India.\n\n` +
    `Sincerely,\n${firstName} ${lastName}`
  );

  // lookup MP
  const findMP = async () => {
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
      alert(err.message);
    }
  };

  // send email + log
  const sendEmail = () => {
    if (!mpData) return;
    const subject = 'Urgent Request: Do Not Invite Indian Delegation to G7 Summit';
    const ccList  = ['info@ontariogurdwaras.com','Bill.Blair@parl.gc.ca','pm@pm.gc.ca'].join(',');
    const bodyEnc = encodeURIComponent(emailBody);

    window.open(
      `mailto:${mpData.email}?cc=${ccList}&subject=${encodeURIComponent(subject)}&body=${bodyEnc}`,
      '_blank'
    );

    fetch(
      'https://script.google.com/macros/s/AKfycbyehZjSH_tZQMrNKOqOrqtk2bOVgCyqbN5bJgepB7XgSTpr9MMhNUnLqSGEDmy8MIhauA/exec',
      { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ firstName, lastName, email, postalCode, mpName: mpData.name, mpEmail: mpData.email })
      }
    );

    setTimeout(() => {
      setShowModal(false);
      setShowThankYouModal(true);
    }, 2000);
  };

  return (
    <div className={styles.homeWrapper}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>Join Our Campaign</h1>
          <h2 className={styles.heroSubTitle}>
            Tell your MP that Indian officials responsible for violence cannot be invited to the G7
          </h2>
        </div>
        <div className={styles.heroImageWrapper}>
          <img
            src="/images/hero-image.jpeg"
            alt="Campaign spotlight"
            className={styles.heroImage}
          />
        </div>
      </section>

      {/* ────────────────────────────────────────── Action Items Section ────────────────────────────────────────── */}
      <section className={styles.actionsSection}>
        <h2 className={styles.sectionHeading}>
          Members of Parliament need to stand up for justice and accountability by taking the following actions
        </h2>
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

      {/* Original Form Container */}
      <div className={styles.container}>
        <p className={styles.contextText}>
          Confirmed information received by the Sikh Federation Canada indicates that newly elected Prime Minister Mark Carney
          and Foreign Minister Anita Anand are prioritizing trade interests at the expense of Canadian sovereignty and public safety...
        </p>
        <h2 className={styles.callToAction}>"JOIN OUR EMAIL CAMPAIGN TO RAISE YOUR VOICE"</h2>
        <ul className={styles.howItWorks}>
          <li>✓ We will look up your MP based on your postal code</li>
          <li>✓ A pre-written email will be created for you</li>
          <li>✓ All you need to do is review and send</li>
        </ul>
        <p className={styles.instructions}>
          Once you provide your information below, a pre-written email will automatically open in your mail app...
        </p>
        <div className={styles.formGroup}>
          <label className={styles.label}>First Name</label>
          <input className={styles.input} value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="Enter your first name"/>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Last Name</label>
          <input className={styles.input} value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Enter your last name"/>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Email</label>
          <input type="email" className={styles.input} value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your email"/>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Postal Code (e.g., L6R 0S4)</label>
          <input className={styles.input} value={postalCode} onChange={e=>setPostalCode(e.target.value.toUpperCase())} placeholder="Enter your postal code"/>
        </div>
        {!showModal && (
          <div className={styles.buttonWrapper}>
            <button className={styles.button} onClick={findMP}>Find My MP</button>
          </div>
        )}
      </div>

      {/* Email Preview Modal */}
      {showModal && mpData && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3>Email Preview</h3>
            <p><strong>To:</strong> {mpData.email}</p>
            <p><strong>Subject:</strong> Urgent Request: Do Not Invite Indian Delegation</p>
            <label className={styles.label}>Message</label>
            <textarea className={styles.input} rows={8} value={emailBody} onChange={e=>setEmailBody(e.target.value)}/>
            <div className={styles.buttonWrapper}>
              <button className={styles.button} onClick={sendEmail}>Send Email to MP</button>
              <button className={styles.secondaryButton} onClick={()=>setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Thank You Modal */}
      {showThankYouModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3>Thank You!</h3>
            <p>Your email has been logged successfully. We appreciate your action.</p>
            <div className={styles.buttonWrapper}>
              <button className={styles.button} onClick={()=>setShowThankYouModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ───────────────────────────────────────────────────── AboutPage ─────────────────────────────────────────────────────
function AboutPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.mainTitle}>About</h1>
      <p className={styles.contextText}>
        The Ontario Gurdwaras Committee represents gurdwaras across Ontario, advocating for Sikh Canadians' rights and promoting community welfare...
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
        <textarea className={styles.input} rows={6} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Type your message here..."/>
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
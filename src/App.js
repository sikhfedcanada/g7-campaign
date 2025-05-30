import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './App.module.css';

export default function App() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [mpData, setMpData] = useState(null);
  const [emailBody, setEmailBody] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Apply dark/light theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  const toggleDarkMode = () => setDarkMode(d => !d);

  // Generate default email body
  const generateDefaultBody = mpName => (
    `Dear ${mpName},\n\n` +
    `I am writing as a concerned constituent from ${postalCode} to strongly urge you to oppose any invitation to officials from the Government of India to the upcoming G7 Summit in Canada.\n\n` +
    `The Ontario Gurdwaras Committee and many others have raised serious concerns regarding foreign interference, threats to Canadian sovereignty, and violence targeting Sikh Canadians, all of which remain unresolved. No invitation should be extended until there is full cooperation with Canadian criminal investigations and substantive reforms by the Government of India.\n\n` +
    `Sincerely,\n${firstName} ${lastName}`
  );

  // Lookup MP by postal code
  const findMP = async () => {
    try {
      const res = await axios.get(
        `https://represent.opennorth.ca/postcodes/${encodeURIComponent(postalCode)}/`
      );
      const mp = res.data.representatives_centroid.find(r => r.elected_office === 'MP');
      if (!mp) throw new Error('No MP found for that postal code.');
      setMpData(mp);
      setEmailBody(generateDefaultBody(mp.name));
      setShowModal(true);
    } catch (err) {
      alert(err.message || 'Error finding your MP—please check your postal code.');
    }
  };

  // Send email and log to sheet
  const sendEmail = () => {
    if (!mpData) return;
    const subject = 'Urgent Request: Do Not Invite Indian Delegation to G7 Summit';
    const ccList = ['info@ontariogurdwaras.com','Bill.Blair@parl.gc.ca','pm@pm.gc.ca'].join(',');
    const bodyEncoded = encodeURIComponent(emailBody);

    // 1) Open mail client
    window.open(
      `mailto:${mpData.email}?cc=${ccList}&subject=${encodeURIComponent(subject)}&body=${bodyEncoded}`,
      '_blank'
    );

    // 2) Log to Google Sheet (no-cors)
    fetch(
      'https://script.google.com/macros/s/AKfycbyehZjSH_tZQMrNKOqOrqtk2bOVgCyqbN5bJgepB7XgSTpr9MMhNUnLqSGEDmy8MIhauA/exec',
      { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, postalCode, mpName: mpData.name, mpEmail: mpData.email })
      }
    );

    // Delay closing email modal and show thank you modal
    setTimeout(() => {
      setShowModal(false);
      setShowThankYouModal(true);
    }, 2000);
  };

  return (
    <div className={styles.pageWrapper}>
      <button className={styles.toggleDark} onClick={toggleDarkMode}>
        Toggle {darkMode ? 'Light' : 'Dark'} Mode
      </button>

      <div className={styles.container}>
        <h1 className={styles.mainTitle}>
          Tell your MP that Indian officials responsible for violence cannot be invited to the G7
        </h1>

        <p className={styles.contextText}>
          Confirmed information received by the Sikh Federation Canada indicates that newly elected Prime Minister Mark Carney
          and Foreign Minister Anita Anand are prioritizing trade interests at the expense of Canadian sovereignty and public safety.
          This is despite clear confirmation from Canada’s own security agencies and members of the Liberal government that Indian
          officials were directly involved in the assassination of Bhai Hardeep Singh Nijjar and in orchestrating a broader campaign
          of violence, disinformation, and destabilization targeting the Sikh community in Canada. With over 800,000 Sikhs across the
          country being systematically targeted, the Government of Canada must not extend an invitation to Indian officials to the
          G7 Summit. Instead, targeted sanctions must be imposed until the demands outlined in the attached letter are met.
        </p>

        <h2 className={styles.callToAction}>
          "JOIN OUR EMAIL CAMPAIGN TO RAISE YOUR VOICE"
        </h2>

        <ul className={styles.howItWorks}>
          <li>✓ We will look up your MP based on your postal code</li>
          <li>✓ A pre-written email will be created for you</li>
          <li>✓ All you need to do is review and press ‘Send’</li>
        </ul>

        <p className={styles.instructions}>
          Once you provide your information below, a pre-written email will automatically open in your mail app, addressed to
          your MP and the Prime Minister’s Office. The email includes the necessary content, and you’ll have the option to
          personalize it before pressing send.
        </p>

        <div className={styles.formGroup}>
          <label className={styles.label}>First Name</label>
          <input className={styles.input} value={firstName}
            onChange={e => setFirstName(e.target.value)} placeholder="Enter your first name" />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Last Name</label>
          <input className={styles.input} value={lastName}
            onChange={e => setLastName(e.target.value)} placeholder="Enter your last name" />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Email</label>
          <input type="email" className={styles.input} value={email}
            onChange={e => setEmail(e.target.value)} placeholder="Enter your email" />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Postal Code (e.g., L6R 0S4)</label>
          <input className={styles.input} value={postalCode}
            onChange={e => setPostalCode(e.target.value.toUpperCase())}
            placeholder="Enter your postal code" />
        </div>

        {!showModal && (
          <div className={styles.buttonWrapper}>
            <button className={styles.button} onClick={findMP}>
              Find My MP
            </button>
          </div>
        )}

        {showModal && mpData && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalBox}>
              <h3>Email Preview</h3>
              <p><strong>To:</strong> {mpData.email}</p>
              <p><strong>Subject:</strong> Urgent Request: Do Not Invite Indian Delegation to G7 Summit</p>

              <label className={styles.label}>Message</label>
              <textarea className={styles.input} rows={8}
                value={emailBody} onChange={e => setEmailBody(e.target.value)} />

              <div className={styles.buttonWrapper}>
                <button className={styles.button} onClick={sendEmail}>
                  Send Email to MP
                </button>
                <button className={styles.secondaryButton} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showThankYouModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalBox}>
              <h3>Thank You!</h3>
              <p>Your email has been logged successfully. We appreciate your action.</p>
              <div className={styles.buttonWrapper}>
                <button className={styles.button} onClick={() => setShowThankYouModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <p className={styles.disclaimer}>
          * By submitting, you agree to allow Sikh Federation (Canada) to use your contact details to keep you updated on this campaign.
        </p>
      </div>
    </div>
  );
}

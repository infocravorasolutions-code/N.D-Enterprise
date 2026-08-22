import React from 'react'
import { Link } from 'react-router-dom'
import './PrivacyPolicy.css'

const PrivacyPolicy = () => {
  const lastUpdated = 'August 22, 2026'

  return (
    <div className="privacy-container">
      <div className="privacy-card">
        <div className="privacy-header">
          <div className="privacy-logo">
            <span className="logo-badge">ND</span>
            <h1>ND Enterprise</h1>
          </div>
          <h2>Privacy Policy</h2>
          <p className="effective-date">Last Updated: {lastUpdated}</p>
        </div>

        <div className="privacy-body">
          <section className="privacy-section">
            <h3>1. Introduction</h3>
            <p>
              Welcome to <strong>ND Enterprise</strong> ("we", "our", or "us"). We are committed to protecting your privacy and handling your data transparently. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application, web portal, and workforce management services.
            </p>
          </section>

          <section className="privacy-section">
            <h3>2. Information We Collect</h3>
            <p>We may collect information about you in a variety of ways depending on your interaction with the ND Enterprise application:</p>
            <ul>
              <li>
                <strong>Personal Identity & Contact Information:</strong> Full name, phone number, email address, job role (Admin, Manager, Employee), and assigned construction or operational site details.
              </li>
              <li>
                <strong>Attendance & Location Data:</strong> Clock-in and clock-out timestamps, shift logs, site location checks for verifying presence at assigned workplace sites, and attendance records.
              </li>
              <li>
                <strong>Device Information:</strong> Device model, operating system version, unique device identifiers, IP address, and app usage diagnostics.
              </li>
              <li>
                <strong>Media & Uploads:</strong> Photos or attachments explicitly uploaded for site documentation, attendance verification, or employee profile creation.
              </li>
            </ul>
          </section>

          <section className="privacy-section">
            <h3>3. How We Use Your Information</h3>
            <p>We use the collected information for essential workforce management and operational purposes, including:</p>
            <ul>
              <li>Managing user authentication and access controls for Admins, Managers, and Employees.</li>
              <li>Recording and verifying workplace attendance, shift timings, and master roll reports.</li>
              <li>Generating site management, supervisor, and monthly summary reports.</li>
              <li>Ensuring security, preventing fraudulent clock-ins, and auditing site logs.</li>
              <li>Maintaining and improving the functionality of our application and services.</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h3>4. Data Sharing & Disclosure</h3>
            <p>
              We prioritize data security and confidentiality. <strong>We do not sell, rent, or trade your personal data to third parties or advertising networks.</strong>
            </p>
            <p>Data may be shared only under the following limited circumstances:</p>
            <ul>
              <li>
                <strong>Authorized Enterprise Personnel:</strong> Designated Admins and Managers within your organization can view attendance logs, employee details, and site reports relevant to their management scope.
              </li>
              <li>
                <strong>Service Providers:</strong> Secure cloud hosting, database, and infrastructure providers operating under strict confidentiality agreements.
              </li>
              <li>
                <strong>Legal Requirements:</strong> If required by law, regulation, or valid legal process to protect rights, safety, and property.
              </li>
            </ul>
          </section>

          <section className="privacy-section">
            <h3>5. Data Security</h3>
            <p>
              We implement industry-standard administrative, technical, and physical security measures to safeguard your personal data against unauthorized access, loss, alteration, or misuse. Data transmissions are encrypted using SSL/TLS protocols.
            </p>
          </section>

          <section className="privacy-section">
            <h3>6. Data Retention</h3>
            <p>
              We retain personal data and attendance records for as long as necessary to fulfill the operational requirements of your organization, satisfy legal or tax compliance obligations, and resolve disputes.
            </p>
          </section>

          <section className="privacy-section">
            <h3>7. Your Rights & Data Choices</h3>
            <p>
              Depending on your role and applicable laws, you have the right to access, review, or request corrections to your personal information. Employees may contact their organization’s ND Enterprise Administrator to update profiles or request account/data deletion.
            </p>
          </section>

          <section className="privacy-section">
            <h3>8. Children's Privacy</h3>
            <p>
              Our application is intended strictly for enterprise and workforce management and is not directed to individuals under the age of 18. We do not knowingly collect personal data from children.
            </p>
          </section>

          <section className="privacy-section">
            <h3>9. Changes to This Privacy Policy</h3>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices or legal obligations. Updated versions will be posted on this page with a revised "Last Updated" date.
            </p>
          </section>

          <section className="privacy-section">
            <h3>10. Contact Us</h3>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or data privacy practices, please contact us at:
            </p>
            <div className="contact-card">
              <p><strong>ND Enterprise Support & Privacy Team</strong></p>
              <p>Email: <a href="mailto:support@ndenterprise.com">support@ndenterprise.com</a></p>
            </div>
          </section>
        </div>

        <div className="privacy-footer">
          <Link to="/login" className="back-link">← Back to Login</Link>
          <p className="copyright">© 2026 ND Enterprise. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy

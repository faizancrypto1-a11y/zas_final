'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Phone, 
  Mail, 
  MapPin, 
  MessagesSquare 
} from 'lucide-react';
import { useConfig } from 'src/context/StoreContext';

const FacebookIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const InstagramIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const XIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const YoutubeIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

const Footer = () => {
  const { settings } = useConfig();

  return (
    <footer className="main-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Column 1: Shop Categories */}
          <div className="footer-col">
            <h4>Shop Cricket</h4>
            <ul className="footer-links">
              <li><Link href="/shop?category=cricket-bats">Cricket Bats</Link></li>
              <li><Link href="/shop?category=cricket-balls">Cricket Balls</Link></li>
              <li><Link href="/shop?category=protective-gear">Protection Gear</Link></li>
              <li><Link href="/shop?category=cricket-shoes">Shoes</Link></li>
              <li><Link href="/shop?category=cricket-bags">Kit Bags</Link></li>
              <li><Link href="/shop?category=cricket-clothing">Cricket Clothing</Link></li>
            </ul>
          </div>

          {/* Column 2: Legal / Policies */}
          <div className="footer-col">
            <h4>Policies</h4>
            <ul className="footer-links">
              <li><Link href="/policies/shipping-policy">Shipping Policy</Link></li>
              <li><Link href="/policies/return-policy">Return & Exchange</Link></li>
              <li><Link href="/policies/privacy-policy">Privacy Policy</Link></li>
              <li><Link href="/policies/terms-and-conditions">Terms & Conditions</Link></li>
            </ul>
          </div>

          {/* Column 3: Customer Care */}
          <div className="footer-col">
            <h4>Support</h4>
            <ul className="footer-links">
              <li><Link href="/track-order">Track Order</Link></li>
              <li><Link href="/account">My Account</Link></li>
              <li><Link href="/wishlist">My Wishlist</Link></li>
              <li><Link href="/contact">Contact Support</Link></li>
              <li><Link href="/about">About Zassports</Link></li>
            </ul>
          </div>

          {/* Column 4: Contact & Socials */}
          <div className="footer-col">
            <h4>Contact Info</h4>
            <div className="footer-contact-info">
              <div className="footer-contact-item">
                <MapPin size={18} style={{ flexShrink: 0 }} />
                <span>{settings.address}</span>
              </div>
              <div className="footer-contact-item">
                <Phone size={16} style={{ flexShrink: 0 }} />
                <span>{settings.contactNumber}</span>
              </div>
              <div className="footer-contact-item">
                <MessagesSquare size={16} style={{ flexShrink: 0 }} />
                <span>WhatsApp: {settings.whatsappNumber}</span>
              </div>
              <div className="footer-contact-item">
                <Mail size={16} style={{ flexShrink: 0 }} />
                <span>{settings.email}</span>
              </div>
              {settings.gstDetails && (
                <div className="footer-contact-item">
                  <span style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 'bold' }}>GST: {settings.gstDetails}</span>
                </div>
              )}
            </div>

            {/* Social Media Links */}
            <div className="footer-social-icons">
              {settings.socialLinks?.facebook && (
                <a href={settings.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Facebook">
                  <FacebookIcon size={16} />
                </a>
              )}
              {settings.socialLinks?.instagram && (
                <a href={settings.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Instagram">
                  <InstagramIcon size={16} />
                </a>
              )}
              {settings.socialLinks?.twitter && (
                <a href={settings.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Twitter">
                  <XIcon size={16} />
                </a>
              )}
              {settings.socialLinks?.youtube && (
                <a href={settings.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="YouTube">
                  <YoutubeIcon size={16} />
                </a>
              )}
              {/* Default Mock Social Icons if none are set */}
              {(!settings.socialLinks || Object.values(settings.socialLinks).every(l => !l)) && (
                <>
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Facebook">
                    <FacebookIcon size={16} />
                  </a>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Instagram">
                    <InstagramIcon size={16} />
                  </a>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Twitter">
                    <XIcon size={16} />
                  </a>
                  <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="YouTube">
                    <YoutubeIcon size={16} />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer Bottom copyright row */}
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Zassports. All Rights Reserved. Built for Cricket Enthusiasts.</p>
          <p className="footer-designer-credit">
            Designed by{' '}
            <a
              href="https://www.joinscaleflow.in/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Scale Flow
            </a>
            {' / '}
            <a
              href="https://rankzio.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Rank Zio
            </a>
          </p>
          <div style={{ display: 'flex', gap: '15px' }}>
            <Link href="/policies/privacy-policy">Privacy</Link>
            <span>&bull;</span>
            <Link href="/policies/terms-and-conditions">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
